import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
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
        findFirst: jest.fn(),
      },
      role: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      person: {
        findUnique: jest.fn(),
      },
      personClientAccess: {
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    }),
  };

  const mockClsService = {
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClsService, useValue: mockClsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
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
        email: null,
        roleId: 'role-1',
        client: { id: 'client-1', name: 'Test Client' },
      };

      mockPrismaService
        .bypassRLS()
        .invitation.findUnique.mockResolvedValue(mockInvitation);

      const result = await service.validateCode('abc123');

      expect(result.valid).toBe(true);
      expect(result.client).toEqual({ id: 'client-1', name: 'Test Client' });
      expect(result.restrictedToEmail).toBe(false);
      expect(result.hasPreassignedRole).toBe(true);
    });
  });
});
