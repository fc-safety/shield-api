import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from '../../config/api-config.service';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvitationsService', () => {
  let service: InvitationsService;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      invitation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      client: {
        findUnique: jest.fn(),
      },
      site: {
        findUnique: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      personClientAccess: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    }),
  };

  const mockApiClsService = {
    get: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getOrSet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateCode', () => {
    it('should return valid invitation info for a valid code', async () => {
      const mockInvitation = {
        id: 'inv-1',
        code: 'abc123',
        status: 'PENDING',
        expiresOn: new Date(Date.now() + 86400000), // Tomorrow
        email: 'test@example.com',
        roleId: 'role-1',
        siteId: 'site-1',
        client: { id: 'client-1', name: 'Test Client' },
      };

      mockPrismaService
        .bypassRLS()
        .invitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await service.validateCode('abc123');

      expect(result.valid).toBe(true);
      expect(result.client).toEqual({ id: 'client-1', name: 'Test Client' });
      expect(result.email).toBe('test@example.com');
    });
  });
});
