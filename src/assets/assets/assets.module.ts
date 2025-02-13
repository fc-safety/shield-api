import { Module } from '@nestjs/common';
import { ConsumablesModule } from '../consumables/consumables.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [ConsumablesModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
