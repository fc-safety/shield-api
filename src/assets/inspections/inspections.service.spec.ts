import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsService } from './inspections.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { TagsService } from '../tags/tags.service';

describe('InspectionsService', () => {
  let service: InspectionsService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      inspection: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      inspectionSession: {
        findUniqueOrThrow: jest.fn(),
      },
      asset: {
        findUniqueOrThrow: jest.fn(),
      },
      $currentUser: jest.fn(),
    }),
  };

  const mockAssetsService = {
    findOne: jest.fn(),
    testAlertRules: jest.fn(),
  };

  const mockTagsService = {
    validateInspectionToken: jest.fn().mockResolvedValue({ isValid: true }),
    parseInspectionToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AssetsService, useValue: mockAssetsService },
        { provide: TagsService, useValue: mockTagsService },
      ],
    }).compile();

    service = module.get<InspectionsService>(InspectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
