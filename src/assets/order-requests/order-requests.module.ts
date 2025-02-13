import { Module } from '@nestjs/common';
import { OrderRequestsService } from './order-requests.service';
import { OrderRequestsController } from './order-requests.controller';

@Module({
  controllers: [OrderRequestsController],
  providers: [OrderRequestsService],
})
export class OrderRequestsModule {}
