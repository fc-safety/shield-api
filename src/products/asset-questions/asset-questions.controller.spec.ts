import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsController } from './asset-questions.controller';

describe('AssetQuestionsController', () => {
  let controller: AssetQuestionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetQuestionsController],
    }).compile();

    controller = module.get<AssetQuestionsController>(AssetQuestionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
