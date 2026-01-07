import { Test, TestingModule } from '@nestjs/testing';
import { M2mController } from './m2m.controller';
import { M2mService } from './m2m.service';

describe('M2mController', () => {
  let controller: M2mController;

  const mockM2mService = {
    getClientStatus: jest.fn(),
    getTagUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [M2mController],
      providers: [
        { provide: M2mService, useValue: mockM2mService },
      ],
    }).compile();

    controller = module.get<M2mController>(M2mController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
