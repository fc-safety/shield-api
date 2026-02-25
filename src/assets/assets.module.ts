import { Module } from '@nestjs/common';
import { AlertsModule } from './alerts/alerts.module';
import { AssetsModule as AssetsResourceModule } from './assets/assets.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { InspectionRoutesModule } from './inspection-routes/inspection-routes.module';
import { InspectionsModule } from './inspections/inspections.module';
import { ProductRequestsModule } from './product-requests/product-requests.module';
import { ReportsModule } from './reports/reports.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [
    AssetsResourceModule,
    InspectionsModule,
    ConsumablesModule,
    TagsModule,
    ProductRequestsModule,
    AlertsModule,
    InspectionRoutesModule,
    ReportsModule,
  ],
})
export class AssetsModule {}
