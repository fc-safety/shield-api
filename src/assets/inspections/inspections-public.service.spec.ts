import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsPublicService } from './inspections-public.service';

describe('InspectionsPublicService', () => {
  let service: InspectionsPublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InspectionsPublicService],
    }).compile();

    service = module.get<InspectionsPublicService>(InspectionsPublicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
