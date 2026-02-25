import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [RedisModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
