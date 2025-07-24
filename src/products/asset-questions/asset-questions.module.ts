import { Module } from '@nestjs/common';
import { AssetQuestionsController } from './asset-questions.controller';
import { AssetQuestionsService } from './asset-questions.service';

@Module({
  controllers: [AssetQuestionsController],
  providers: [AssetQuestionsService],
  exports: [AssetQuestionsService],
})
export class AssetQuestionsModule {}
