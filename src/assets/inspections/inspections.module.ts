import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { TagsModule } from '../tags/tags.module';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';
import { InspectionsPublicController } from './inspections-public.controller';
import { InspectionsPublicService } from './inspections-public.service';

@Module({
  imports: [AssetsModule, TagsModule],
  controllers: [InspectionsController, InspectionsPublicController],
  providers: [InspectionsService, InspectionsPublicService],
})
export class InspectionsModule {}
