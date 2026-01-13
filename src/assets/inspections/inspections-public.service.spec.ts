import { Test, TestingModule } from '@nestjs/testing';
import { InspectionsPublicService } from './inspections-public.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TagsService } from '../tags/tags.service';

describe('InspectionsPublicService', () => {
  let service: InspectionsPublicService;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      asset: {
        findFirst: jest.fn(),
      },
      tag: {
        findUnique: jest.fn(),
      },
    }),
  };

  const mockTagsService = {
    validateTagUrl: jest.fn(),
    generateInspectionToken: jest.fn(),
    parseInspectionToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InspectionsPublicService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TagsService, useValue: mockTagsService },
      ],
    }).compile();

    service = module.get<InspectionsPublicService>(InspectionsPublicService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
