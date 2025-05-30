import { Module } from '@nestjs/common';
import { PeopleModule } from 'src/clients/people/people.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [RedisModule, PeopleModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
