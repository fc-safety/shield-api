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
  from,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  share,
  switchMap,
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

  public listenDbEvents(options: ListenDbEventsDto) {
    const listenerId = createId();

    return from(this.validateToken(options.token)).pipe(
      switchMap((person) => {
        // Build the channel pattern to listen to.
        const clientId = person.clientId;
        const model = options.models.length > 1 ? '*' : options.models[0];
        const operation =
          options.operations && options.operations.length === 1
            ? options.operations[0]
            : '*';
        const channelPattern = `db-events:${clientId}:${model}:${operation}`;

        return new Observable((observer) => {
          this.logger.debug(
            `[${listenerId}] Adding listener to channel ${channelPattern}`,
          );

          // PREPARE LISTENERS
          // 1. Message listener - main listener to process messages
          // 2. Error listener - to handle errors
          // 3. End listener - to handle end of connection

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
                `[${listenerId}] Error processing message from channel ${channelPattern}`,
                error,
              );
              observer.error(error);
            }
          };

          const errorListener = (err: Error) => {
            this.logger.error(
              `[${listenerId}] Redis subscriber error on channel ${channelPattern}`,
              err,
            );
            observer.error(
              new Error(
                `[${listenerId}] Redis subscriber connection error: ${err.message}`,
              ),
            );
          };

          const endListener = () => {
            this.logger.warn(
              `[${listenerId}] Redis subscriber disconnected while listening to ${channelPattern}`,
            );
            observer.error(
              new Error('Redis subscriber connection closed unexpectedly'),
            );
          };

          // SETUP LISTENERS (including main message listener)

          const startListenerPromise = new Promise<void>(async (resolve) => {
            try {
              // Check if Redis subscriber is connected
              if (!this.redis.getSubscriber().isReady) {
                throw new Error('Redis subscriber is not ready');
              }

              // Add connection health listeners
              this.redis.getSubscriber().on('error', errorListener);
              this.redis.getSubscriber().on('end', endListener);

              await this.redis.addPatternListener(
                channelPattern,
                messageListener,
              );
            } catch (error) {
              this.logger.error(
                `[${listenerId}] Error adding listener to channel ${channelPattern}`,
                error,
              );
              observer.error(error);
            } finally {
              resolve();
            }
          });

          // CLEANUP LISTENERS (called on unsubscribe)

          return async () => {
            this.logger.debug(
              `[${listenerId}] Removing listener from channel ${channelPattern}`,
            );

            // Make sure the listener startup is complete before
            // attempting to clean it up.
            await startListenerPromise;

            await this.redis
              .removePatternListener(channelPattern, messageListener)
              .catch((error) => {
                this.logger.error(
                  `[${listenerId}] Error removing listener from channel ${channelPattern}`,
                  error,
                );
              })
              .finally(() => {
                // Clean up event listeners
                this.redis.getSubscriber().off('error', errorListener);
                this.redis.getSubscriber().off('end', endListener);
              });
          };
        });
      }),
    );
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
