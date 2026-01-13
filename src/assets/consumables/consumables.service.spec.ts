import { Test, TestingModule } from '@nestjs/testing';
import { ConsumablesService } from './consumables.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ConsumablesService', () => {
  let service: ConsumablesService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      consumable: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsumablesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConsumablesService>(ConsumablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
