import { Test, TestingModule } from '@nestjs/testing';
import { M2mController } from './m2m.controller';

describe('M2mController', () => {
  let controller: M2mController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [M2mController],
    }).compile();

    controller = module.get<M2mController>(M2mController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
