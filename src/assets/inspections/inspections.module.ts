import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
@Module({
  imports: [AssetsModule],
  controllers: [InspectionsController],
  providers: [InspectionsService],
})
export class InspectionsModule {}
