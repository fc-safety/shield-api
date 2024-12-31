import { Module } from '@nestjs/common';
import { ConsumablesService } from './consumables.service';
import { ConsumablesController } from './consumables.controller';

@Module({
  controllers: [ConsumablesController],
  providers: [ConsumablesService],
})
export class ConsumablesModule {}
