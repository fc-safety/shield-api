import { Test, TestingModule } from '@nestjs/testing';
import { AnsiCategoriesController } from './ansi-categories.controller';
import { AnsiCategoriesService } from './ansi-categories.service';

describe('AnsiCategoriesController', () => {
  let controller: AnsiCategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnsiCategoriesController],
      providers: [AnsiCategoriesService],
    }).compile();

    controller = module.get<AnsiCategoriesController>(AnsiCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
