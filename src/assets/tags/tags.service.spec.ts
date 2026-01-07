import { Test, TestingModule } from '@nestjs/testing';
import { TagsService } from './tags.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { ClsService } from 'nestjs-cls';
import { AuthService } from 'src/auth/auth.service';

describe('TagsService', () => {
  let service: TagsService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      tag: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    }),
    bypassRLS: jest.fn().mockReturnValue({
      tag: {
        findUnique: jest.fn(),
      },
    }),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockAuthService = {
    generateSignedUrl: jest.fn(),
    validateSignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ClsService, useValue: mockClsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
