import { Test, TestingModule } from '@nestjs/testing';
import { InspectionRoutesService } from './inspection-routes.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('InspectionRoutesService', () => {
  let service: InspectionRoutesService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      inspectionRoute: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      inspectionRoutePoint: {
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
        InspectionRoutesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InspectionRoutesService>(InspectionRoutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
