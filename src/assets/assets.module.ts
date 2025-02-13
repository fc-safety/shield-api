import { Module } from '@nestjs/common';
import { AssetsModule as AssetsResourceModule } from './assets/assets.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { InspectionsModule } from './inspections/inspections.module';
import { TagsModule } from './tags/tags.module';
import { OrderRequestsModule } from './order-requests/order-requests.module';

@Module({
  imports: [
    AssetsResourceModule,
    InspectionsModule,
    ConsumablesModule,
    TagsModule,
    OrderRequestsModule,
  ],
})
export class AssetsModule {}
