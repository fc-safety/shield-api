import { Test, TestingModule } from '@nestjs/testing';
import { AnsiCategoriesService } from './ansi-categories.service';

describe('AnsiCategoriesService', () => {
  let service: AnsiCategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnsiCategoriesService],
    }).compile();

    service = module.get<AnsiCategoriesService>(AnsiCategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
