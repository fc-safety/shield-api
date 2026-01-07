import { Test, TestingModule } from '@nestjs/testing';
import { M2mService } from './m2m.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TagsService } from 'src/assets/tags/tags.service';

describe('M2mService', () => {
  let service: M2mService;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      client: {
        findUnique: jest.fn(),
      },
      person: {
        findFirst: jest.fn(),
      },
    }),
  };

  const mockTagsService = {
    generateSignedTagUrl: jest.fn(),
    validateTagUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        M2mService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TagsService, useValue: mockTagsService },
      ],
    }).compile();

    service = module.get<M2mService>(M2mService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
