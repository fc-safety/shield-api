import { Module } from '@nestjs/common';
import { MembersModule } from 'src/clients/members/members.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { ConsumablesModule } from '../consumables/consumables.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [ConsumablesModule, MembersModule, NotificationsModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
