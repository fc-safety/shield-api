import { Test, TestingModule } from '@nestjs/testing';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

describe('TagsController', () => {
  let controller: TagsController;

  const mockTagsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOneForInspection: jest.fn(),
    findOneForAssetSetup: jest.fn(),
    checkRegistration: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    generateSignedUrlSingle: jest.fn(),
    generateSignedUrlBulkJson: jest.fn(),
    generateSignedUrlBulkCsv: jest.fn(),
    registerTag: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagsController],
      providers: [
        { provide: TagsService, useValue: mockTagsService },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
