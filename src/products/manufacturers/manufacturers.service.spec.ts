import { Test, TestingModule } from '@nestjs/testing';
import { ManufacturersService } from './manufacturers.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ManufacturersService', () => {
  let service: ManufacturersService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      manufacturer: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
    bypassRLS: jest.fn().mockReturnValue({
      manufacturer: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManufacturersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ManufacturersService>(ManufacturersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
