import { Module } from '@nestjs/common';
import { InspectionRoutesService } from './inspection-routes.service';
import { InspectionRoutesController } from './inspection-routes.controller';

@Module({
  controllers: [InspectionRoutesController],
  providers: [InspectionRoutesService],
})
export class InspectionRoutesModule {}
