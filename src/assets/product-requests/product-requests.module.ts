import { Module } from '@nestjs/common';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ProductRequestsController } from './product-requests.controller';
import { ProductRequestsService } from './product-requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ProductRequestsController],
  providers: [ProductRequestsService],
})
export class ProductRequestsModule {}
