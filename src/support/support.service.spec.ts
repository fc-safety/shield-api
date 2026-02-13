import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('SupportService', () => {
  let service: SupportService;

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      client: {
        findFirst: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
