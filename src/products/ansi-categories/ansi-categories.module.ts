import { Module } from '@nestjs/common';
import { AnsiCategoriesService } from './ansi-categories.service';
import { AnsiCategoriesController } from './ansi-categories.controller';

@Module({
  controllers: [AnsiCategoriesController],
  providers: [AnsiCategoriesService],
})
export class AnsiCategoriesModule {}
