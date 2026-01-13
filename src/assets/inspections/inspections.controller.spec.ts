import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsController } from './inspections.controller';
import { InspectionsService } from './inspections.service';

describe('InspectionsController', () => {
  let controller: InspectionsController;

  const mockInspectionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActiveInspectionSessionsForAsset: jest.fn(),
    findInspectionSession: jest.fn(),
    cancelInspectionSession: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionsController],
      providers: [
        { provide: InspectionsService, useValue: mockInspectionsService },
      ],
    }).compile();

    controller = module.get<InspectionsController>(InspectionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
