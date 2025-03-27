import { Module } from '@nestjs/common';
import { UsersModule } from 'src/clients/users/users.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ConsumablesModule } from '../consumables/consumables.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [ConsumablesModule, UsersModule, NotificationsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
