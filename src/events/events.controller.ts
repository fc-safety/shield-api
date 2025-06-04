import { Controller, Get, Query, Sse } from '@nestjs/common';
import { interval, map, merge } from 'rxjs';
import { Public } from 'src/auth/auth.guard';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ListenDbEventsDto } from './dto/listen-db-events.dto';
import { EventsService } from './events.service';

const PING_INTERVAL_SECONDS = 15;

@Controller('events')
@CheckIsAuthenticated()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse('db/listen')
  @Public()
  public listenDbEvents(@Query() options: ListenDbEventsDto) {
    return merge(
      interval(PING_INTERVAL_SECONDS * 1000).pipe(
        map(() => ({ data: 'ping', type: 'ping' })),
      ),
      this.eventsService
        .listenDbEvents(options)
        .pipe(map((event) => ({ data: event }))),
    );
  }

  @Get('token')
  public async generateToken() {
    return this.eventsService.generateToken().then((token) => ({ token }));
  }
}
