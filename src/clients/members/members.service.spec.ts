import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPersonClientAccess = {
    findFirst: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  };

  const mockPrismaClient = {
    person: {
      findManyForPage: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    personClientAccess: mockPersonClientAccess,
    $transaction: jest.fn((cb) => cb(mockPrismaClient)),
  };

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue(mockPrismaClient),
  };

  const mockApiClsService = {
    requireAccessGrant: jest.fn().mockReturnValue({
      clientId: 'test-client-id',
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    mdel: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockKeycloakService = {
    client: {
      users: {
        resetPasswordEmail: jest.fn(),
      },
    },
  };

  const mockInvitationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: InvitationsService, useValue: mockInvitationsService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
    jest.clearAllMocks();

    // Re-apply defaults after clearAllMocks
    mockPrismaService.build.mockResolvedValue(mockPrismaClient);
    mockPrismaClient.$transaction.mockImplementation((cb) =>
      cb(mockPrismaClient),
    );
    mockApiClsService.requireAccessGrant.mockReturnValue({
      clientId: 'test-client-id',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('removeRole', () => {
    const personId = 'person-1';
    const dto = { roleId: 'role-1', siteId: 'site-1' };

    const baseAccess = {
      id: 'access-1',
      personId,
      clientId: 'test-client-id',
      roleId: 'role-1',
      siteId: 'site-1',
      isPrimary: false,
    };

    beforeEach(() => {
      mockPrismaClient.person.findFirstOrThrow.mockResolvedValue({
        id: personId,
        idpId: 'idp-1',
      });
    });

    it('should remove a non-primary role without promotion', async () => {
      mockPersonClientAccess.findFirst.mockResolvedValueOnce(baseAccess);
      mockPersonClientAccess.count.mockResolvedValueOnce(2);
      mockPersonClientAccess.delete.mockResolvedValueOnce(undefined);

      await service.removeRole(personId, dto);

      expect(mockPersonClientAccess.delete).toHaveBeenCalledWith({
        where: { id: 'access-1' },
      });
      // No promotion queries since isPrimary is false
      expect(mockPersonClientAccess.updateMany).not.toHaveBeenCalled();
    });

    it('should promote oldest remaining access when removing a primary role and no other primary exists', async () => {
      const primaryAccess = { ...baseAccess, isPrimary: true };
      mockPersonClientAccess.findFirst
        .mockResolvedValueOnce(primaryAccess) // findFirst for the access row
        .mockResolvedValueOnce(null) // remainingPrimary check
        .mockResolvedValueOnce({
          // oldestRemaining
          id: 'access-2',
          clientId: 'other-client',
          siteId: 'other-site',
        });
      mockPersonClientAccess.count.mockResolvedValueOnce(2);
      mockPersonClientAccess.delete.mockResolvedValueOnce(undefined);
      mockPersonClientAccess.updateMany.mockResolvedValueOnce({ count: 1 });

      await service.removeRole(personId, dto);

      expect(mockPersonClientAccess.updateMany).toHaveBeenCalledWith({
        where: {
          personId,
          clientId: 'other-client',
          siteId: 'other-site',
        },
        data: { isPrimary: true },
      });
    });

    it('should not promote when removing a primary role but another primary still exists', async () => {
      const primaryAccess = { ...baseAccess, isPrimary: true };
      mockPersonClientAccess.findFirst
        .mockResolvedValueOnce(primaryAccess) // findFirst for the access row
        .mockResolvedValueOnce({ id: 'access-3', isPrimary: true }); // remainingPrimary exists
      mockPersonClientAccess.count.mockResolvedValueOnce(2);
      mockPersonClientAccess.delete.mockResolvedValueOnce(undefined);

      await service.removeRole(personId, dto);

      expect(mockPersonClientAccess.updateMany).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when removing the last role', async () => {
      mockPersonClientAccess.findFirst.mockResolvedValueOnce(baseAccess);
      mockPersonClientAccess.count.mockResolvedValueOnce(1);

      await expect(service.removeRole(personId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPersonClientAccess.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown role/site combo', async () => {
      mockPersonClientAccess.findFirst.mockResolvedValueOnce(null);

      await expect(service.removeRole(personId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPersonClientAccess.count).not.toHaveBeenCalled();
      expect(mockPersonClientAccess.delete).not.toHaveBeenCalled();
    });
  });
});
