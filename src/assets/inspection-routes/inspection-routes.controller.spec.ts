import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoutesController } from './inspection-routes.controller';
import { InspectionRoutesService } from './inspection-routes.service';

describe('InspectionRoutesController', () => {
  let controller: InspectionRoutesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionRoutesController],
      providers: [InspectionRoutesService],
    }).compile();

    controller = module.get<InspectionRoutesController>(InspectionRoutesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
