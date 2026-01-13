import { Test, TestingModule } from '@nestjs/testing';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

describe('AssetsController', () => {
  let controller: AssetsController;

  const mockAssetsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findManyWithLatestInspection: jest.fn(),
    getMetadataKeys: jest.fn(),
    getMetadataValues: jest.fn(),
    sendReminderNotifications: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    addTag: jest.fn(),
    configure: jest.fn(),
    setup: jest.fn(),
    updateSetup: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [{ provide: AssetsService, useValue: mockAssetsService }],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
