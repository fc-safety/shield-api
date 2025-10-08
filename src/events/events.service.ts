import {
  ForbiddenException,
  Injectable,
  Logger,
  MessageEvent,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { ClsService } from 'nestjs-cls';
import {
  endWith,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  share,
  takeUntil,
} from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import {
  PeopleService,
  PersonRepresentation,
} from 'src/clients/people/people.service';
import { CommonClsStore } from 'src/common/types';
import { RedisService } from 'src/redis/redis.service';
import { ListenDbEventsDto } from './dto/listen-db-events.dto';

const EXPIRES_IN_SECONDS = 60 * 60 * 24; // 24 hours
const PING_INTERVAL_SECONDS = 15;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    protected readonly cls: ClsService<CommonClsStore>,
    private readonly redis: RedisService,
    private readonly peopleService: PeopleService,
    private readonly authService: AuthService,
  ) {}

  public listenDbEvents(
    person: PersonRepresentation,
    options: ListenDbEventsDto,
    listenerId?: string,
  ) {
    listenerId = listenerId ?? createId();
    const model = options.models.length > 1 ? '*' : options.models[0];
    const operation =
      options.operations && options.operations.length === 1
        ? options.operations[0]
        : '*';

    const channel = `db-events:${person.clientId}:${model}:${operation}`;
    return new Observable((observer) => {
      this.logger.debug(
        `[${listenerId}] Adding listener to channel ${channel}`,
      );

      let messageListenerActive = false;
      let errorListener: ((err: Error) => void) | null = null;
      let endListener: (() => void) | null = null;

      const messageListener = (message: string) => {
        try {
          const payload = JSON.parse(message) as Record<string, string>;

          if (!options.models.includes(payload.model as any)) {
            return;
          }

          if (
            options.operations &&
            !options.operations.includes(payload.operation as any)
          ) {
            return;
          }

          if (options.ids && !options.ids.includes(payload.id)) {
            return;
          }

          observer.next(payload);
        } catch (error) {
          this.logger.error(
            `[${listenerId}] Error processing message from channel ${channel}`,
            error,
          );
          observer.error(error);
        }
      };

      const cleanup = () => {
        if (!messageListenerActive) {
          return;
        }
        this.logger.debug(
          `[${listenerId}] Removing listener from channel ${channel}`,
        );

        this.redis
          .removePatternListener(channel, messageListener)
          .then(() => {
            messageListenerActive = false;
          })
          .catch((error) => {
            this.logger.error(
              `[${listenerId}] Error removing listener from channel ${channel}`,
              error,
            );
          });

        // Clean up event listeners
        if (errorListener) {
          this.redis.getSubscriber().off('error', errorListener);
          errorListener = null;
        }
        if (endListener) {
          this.redis.getSubscriber().off('end', endListener);
          endListener = null;
        }
      };

      // Monitor Redis subscriber connection health
      errorListener = (err: Error) => {
        this.logger.error(
          `[${listenerId}] Redis subscriber error on channel ${channel}`,
          err,
        );
        observer.error(
          new Error(
            `[${listenerId}] Redis subscriber connection error: ${err.message}`,
          ),
        );
      };

      endListener = () => {
        this.logger.warn(
          `[${listenerId}] Redis subscriber disconnected while listening to ${channel}`,
        );
        observer.error(
          new Error('Redis subscriber connection closed unexpectedly'),
        );
      };

      // SETUP LISTENERS (including main message listener)
      try {
        // Check if Redis subscriber is connected
        if (!this.redis.getSubscriber().isReady) {
          throw new Error('Redis subscriber is not ready');
        }

        // Add connection health listeners
        this.redis.getSubscriber().on('error', errorListener);
        this.redis.getSubscriber().on('end', endListener);

        this.redis.addPatternListener(channel, messageListener).then(() => {
          messageListenerActive = true;
        });
      } catch (error) {
        this.logger.error(
          `[${listenerId}] Error adding listener to channel ${channel}`,
          error,
        );
        observer.error(error);
      }

      return cleanup;
    });
  }

  public async generateToken() {
    const person = await this.peopleService.getPersonRepresentation();
    return encodeURIComponent(
      await this.authService.generateCustomToken(person, EXPIRES_IN_SECONDS),
    );
  }

  public async validateToken(token: string) {
    const { isValid, error, payload } =
      await this.authService.validateCustomToken<PersonRepresentation>(token);

    if (!isValid) {
      throw new ForbiddenException(error);
    }

    return payload;
  }

  public mergeWithPing(stream: Observable<MessageEvent>) {
    const pingStream$ = interval(PING_INTERVAL_SECONDS * 1000).pipe(
      map(() => ({ data: 'ping', type: 'ping' })),
    );
    const sharedStream$ = stream.pipe(share());

    return merge(pingStream$, sharedStream$).pipe(
      takeUntil(
        sharedStream$.pipe(
          ignoreElements(),
          endWith({ data: 'end', type: 'end' }),
        ),
      ),
    );
  }
}
