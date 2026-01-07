import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoutesController } from './inspection-routes.controller';
import { InspectionRoutesService } from './inspection-routes.service';

describe('InspectionRoutesController', () => {
  let controller: InspectionRoutesController;

  const mockInspectionRoutesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllForAssetId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    createPoint: jest.fn(),
    findAllPoints: jest.fn(),
    findOnePoint: jest.fn(),
    updatePoint: jest.fn(),
    removePoint: jest.fn(),
    reorderPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionRoutesController],
      providers: [
        { provide: InspectionRoutesService, useValue: mockInspectionRoutesService },
      ],
    }).compile();

    controller = module.get<InspectionRoutesController>(
      InspectionRoutesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
