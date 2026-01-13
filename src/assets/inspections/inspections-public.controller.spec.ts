import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsPublicController } from './inspections-public.controller';
import { InspectionsPublicService } from './inspections-public.service';

describe('InspectionsPublicController', () => {
  let controller: InspectionsPublicController;

  const mockInspectionsPublicService = {
    isValidTagUrl: jest.fn(),
    isValidTagId: jest.fn(),
    getInspectionHistory: jest.fn(),
    validateInspectionToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionsPublicController],
      providers: [
        {
          provide: InspectionsPublicService,
          useValue: mockInspectionsPublicService,
        },
      ],
    }).compile();

    controller = module.get<InspectionsPublicController>(
      InspectionsPublicController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
