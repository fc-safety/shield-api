import { Test, TestingModule } from '@nestjs/testing';
import { ManufacturersController } from './manufacturers.controller';
import { ManufacturersService } from './manufacturers.service';

describe('ManufacturersController', () => {
  let controller: ManufacturersController;

  const mockManufacturersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    getOrCreateGeneric: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManufacturersController],
      providers: [
        { provide: ManufacturersService, useValue: mockManufacturersService },
      ],
    }).compile();

    controller = module.get<ManufacturersController>(ManufacturersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
