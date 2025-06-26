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

          const unsubscribe = () => {
            this.logger.debug(`Unsubscribing from channel ${channel}`);
            this.redis.getSubscriber().pUnsubscribe(channel);
          };

          this.redis.getSubscriber().pSubscribe(channel, (message) => {
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
          });

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
