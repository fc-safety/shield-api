import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoutesService } from './inspection-routes.service';

describe('InspectionRoutesService', () => {
  let service: InspectionRoutesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InspectionRoutesService],
    }).compile();

    service = module.get<InspectionRoutesService>(InspectionRoutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
