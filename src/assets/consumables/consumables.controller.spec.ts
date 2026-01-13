import { Test, TestingModule } from '@nestjs/testing';
import { ConsumablesController } from './consumables.controller';
import { ConsumablesService } from './consumables.service';

describe('ConsumablesController', () => {
  let controller: ConsumablesController;

  const mockConsumablesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumablesController],
      providers: [
        { provide: ConsumablesService, useValue: mockConsumablesService },
      ],
    }).compile();

    controller = module.get<ConsumablesController>(ConsumablesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
