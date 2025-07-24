import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsService } from './asset-questions.service';

describe('AssetQuestionsService', () => {
  let service: AssetQuestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetQuestionsService],
    }).compile();

    service = module.get<AssetQuestionsService>(AssetQuestionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
