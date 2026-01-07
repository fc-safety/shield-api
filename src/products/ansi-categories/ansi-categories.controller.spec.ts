import { Test, TestingModule } from '@nestjs/testing';
import { AnsiCategoriesController } from './ansi-categories.controller';
import { AnsiCategoriesService } from './ansi-categories.service';

describe('AnsiCategoriesController', () => {
  let controller: AnsiCategoriesController;

  const mockAnsiCategoriesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnsiCategoriesController],
      providers: [
        { provide: AnsiCategoriesService, useValue: mockAnsiCategoriesService },
      ],
    }).compile();

    controller = module.get<AnsiCategoriesController>(AnsiCategoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
