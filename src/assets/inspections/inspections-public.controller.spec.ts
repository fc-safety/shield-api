import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsPublicController } from './inspections-public.controller';

describe('InspectionsPublicController', () => {
  let controller: InspectionsPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InspectionsPublicController],
    }).compile();

    controller = module.get<InspectionsPublicController>(InspectionsPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
