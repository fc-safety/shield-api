import { Controller, Get, Query, Sse } from '@nestjs/common';
import { map } from 'rxjs';
import { Public } from 'src/auth/auth.guard';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ListenDbEventsDto } from './dto/listen-db-events.dto';
import { EventsService } from './events.service';

@Controller('events')
@CheckIsAuthenticated()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse('db/listen')
  @Public()
  public listenDbEvents(@Query() options: ListenDbEventsDto) {
    return this.eventsService
      .listenDbEvents(options)
      .pipe(map((event) => ({ data: event })));
  }

  @Get('token')
  public async generateToken() {
    return this.eventsService.generateToken().then((token) => ({ token }));
  }
}
