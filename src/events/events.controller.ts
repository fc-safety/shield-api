import {
  Controller,
  Get,
  Logger,
  MessageEvent,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { SseStream } from '@nestjs/core/router/sse-stream';
import { createId } from '@paralleldrive/cuid2';
import { Request, Response } from 'express';
import { catchError, concatMap, EMPTY, map } from 'rxjs';
import { Public } from 'src/auth/auth.guard';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ListenDbEventsDto } from './dto/listen-db-events.dto';
import { EventsService } from './events.service';

@Controller('events')
@CheckIsAuthenticated()
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Get('db/listen')
  @Public()
  public async listenDbEvents(
    @Query() options: ListenDbEventsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const person = await this.eventsService.validateToken(options.token);

    // It's possible that we sent headers already so don't use a stream
    if (res.writableEnded) {
      return;
    }

    const stream = new SseStream(req);
    stream.pipe(res);

    const listenerId = createId();

    const eventsStream$ = this.eventsService.mergeWithPing(
      this.eventsService
        .listenDbEvents(person, options, listenerId)
        .pipe(map((event) => ({ data: event }) as MessageEvent)),
    );

    const subscription = eventsStream$
      .pipe(
        // Use concatMap to force sequential writing of messages. The promise
        // will only resolve if the write buffer is not full. This prevents
        // backpressure issues.
        concatMap(
          (msg) =>
            new Promise<void>((resolve) =>
              stream.writeMessage(msg, () => resolve()),
            ),
        ),
        catchError((err) => {
          const data = err instanceof Error ? err.message : err;
          stream.writeMessage({ type: 'error', data }, (writeError) => {
            if (writeError) {
              this.logger.error(writeError);
            }
          });

          return EMPTY;
        }),
      )
      .subscribe({
        complete: () => {
          this.logger.debug(
            `[${listenerId}] Events stream completed, closing response.`,
          );
          res.end();
        },
      });

    req.on('close', () => {
      subscription.unsubscribe();
      if (!stream.writableEnded) {
        stream.end();
      }
    });

    stream.on('error', (e) => {
      this.logger.error(`[${listenerId}] Events stream error`, e);
    });
  }

  @Get('token')
  public async generateToken() {
    return this.eventsService.generateToken().then((token) => ({ token }));
  }
}
