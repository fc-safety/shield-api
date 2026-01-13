import { Test, TestingModule } from '@nestjs/testing';
import { AssetQuestionsController } from './asset-questions.controller';
import { AssetQuestionsService } from './asset-questions.service';

describe('AssetQuestionsController', () => {
  let controller: AssetQuestionsController;

  const mockAssetQuestionsService = {
    getStateOptions: jest.fn(),
    findClientCustomizations: jest.fn(),
    addClientCustomization: jest.fn(),
    updateClientCustomization: jest.fn(),
    removeClientCustomization: jest.fn(),
    findByAssetId: jest.fn(),
    findByAssetProperties: jest.fn(),
    checkAssetConfiguration: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addVariant: jest.fn(),
    addCondition: jest.fn(),
    updateCondition: jest.fn(),
    removeCondition: jest.fn(),
    migrateQuestionsToConditions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetQuestionsController],
      providers: [
        { provide: AssetQuestionsService, useValue: mockAssetQuestionsService },
      ],
    }).compile();

    controller = module.get<AssetQuestionsController>(AssetQuestionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
