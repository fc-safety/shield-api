import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { from, Observable, switchMap } from 'rxjs';
import { AuthService } from 'src/auth/auth.service';
import {
  PeopleService,
  PersonRepresentation,
} from 'src/clients/people/people.service';
import { CommonClsStore } from 'src/common/types';
import { RedisService } from 'src/redis/redis.service';
import { ListenDbEventsDto } from './dto/listen-db-events.dto';

const EXPIRES_IN_SECONDS = 60 * 60 * 24; // 24 hours

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
    return from(this.validateToken(options.token)).pipe(
      switchMap((person) => {
        const model = options.models.length > 1 ? '*' : options.models[0];
        const operation =
          options.operations && options.operations.length === 1
            ? options.operations[0]
            : '*';

        const channel = `db-events:${person.clientId}:${model}:${operation}`;
        return new Observable((observer) => {
          this.logger.debug(`Subscribing to channel ${channel}`);

          let isSubscribed = false;
          let errorListener: ((err: Error) => void) | null = null;
          let endListener: (() => void) | null = null;

          const unsubscribe = () => {
            if (!isSubscribed) {
              return;
            }
            this.logger.debug(`Unsubscribing from channel ${channel}`);
            try {
              this.redis.getSubscriber().pUnsubscribe(channel);
              isSubscribed = false;
            } catch (error) {
              this.logger.error(
                `Error unsubscribing from channel ${channel}`,
                error,
              );
            }

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
              `Redis subscriber error on channel ${channel}`,
              err,
            );
            observer.error(
              new Error(`Redis subscriber connection error: ${err.message}`),
            );
          };

          endListener = () => {
            this.logger.warn(
              `Redis subscriber disconnected while listening to ${channel}`,
            );
            observer.error(
              new Error('Redis subscriber connection closed unexpectedly'),
            );
          };

          try {
            const subscriber = this.redis.getSubscriber();

            // Check if subscriber is connected
            if (!subscriber.isReady) {
              throw new Error('Redis subscriber is not ready');
            }

            // Add connection health listeners
            subscriber.on('error', errorListener);
            subscriber.on('end', endListener);

            subscriber.pSubscribe(channel, (message) => {
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
                  `Error processing message from channel ${channel}`,
                  error,
                );
                observer.error(error);
              }
            });

            isSubscribed = true;
          } catch (error) {
            this.logger.error(`Error subscribing to channel ${channel}`, error);
            observer.error(error);
          }

          return unsubscribe;
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
}
