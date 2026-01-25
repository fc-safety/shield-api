import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { AuthService } from 'src/auth/auth.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let mockPrismaService: any;
  let mockClsService: any;

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockAuthService = {
    generateSignedUrl: jest.fn(),
    validateSignedUrl: jest.fn(),
    generateSignature: jest.fn().mockResolvedValue('mock-signature'),
  };

  const createMockTag = (overrides: any = {}) => ({
    id: 'tag-1',
    externalId: 'ext-tag-1',
    clientId: 'client-internal-1',
    siteId: 'site-internal-1',
    client: {
      id: 'client-internal-1',
      externalId: 'client-ext-1',
    },
    site: {
      id: 'site-internal-1',
      externalId: 'site-ext-1',
    },
    asset: null,
    ...overrides,
  });

  beforeEach(async () => {
    mockPrismaService = {
      forContext: jest.fn(),
      forUser: jest.fn(),
      build: jest.fn(),
      bypassRLS: jest.fn(),
    };

    mockClsService = {
      get: jest.fn(),
      set: jest.fn(),
    };

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

  describe('findOneForInspection - multi-client access', () => {
    const setupMocks = (
      mockTag: any,
      user: any,
      personClientAccess: any = null,
    ) => {
      // Mock forUser() to return an object with $currentUser()
      mockPrismaService.forUser.mockResolvedValue({
        $currentUser: jest.fn().mockReturnValue({
          clientId: user?.clientId ?? 'primary-client-internal',
          siteId: 'site-internal-1',
        }),
      });

      // Mock bypassRLS() for tag lookup and PersonClientAccess check
      mockPrismaService.bypassRLS.mockReturnValue({
        tag: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockTag),
        },
        personClientAccess: {
          findFirst: jest.fn().mockResolvedValue(personClientAccess),
        },
      });

      // Mock CLS to return user
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        return undefined;
      });
    };

    it('should return tag when user has primary client access', async () => {
      const mockTag = createMockTag();
      const user = {
        idpId: 'user-idp-1',
        clientId: 'client-ext-1', // Same as tag's client
      };

      setupMocks(mockTag, user);

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual(mockTag);
    });

    it('should return tag when user has secondary client access via PersonClientAccess', async () => {
      const mockTag = createMockTag({
        client: {
          id: 'client-internal-2',
          externalId: 'secondary-client-ext',
        },
      });
      const user = {
        idpId: 'user-idp-1',
        clientId: 'primary-client-ext', // Different from tag's client
      };
      const personClientAccess = {
        id: 'access-1',
        personId: 'person-1',
        clientId: 'client-internal-2',
      };

      setupMocks(mockTag, user, personClientAccess);

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual(mockTag);
      expect(mockPrismaService.bypassRLS).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user lacks access to tag client', async () => {
      const mockTag = createMockTag({
        client: {
          id: 'client-internal-2',
          externalId: 'unauthorized-client-ext',
        },
      });
      const user = {
        idpId: 'user-idp-1',
        clientId: 'primary-client-ext', // Different from tag's client
      };

      setupMocks(mockTag, user, null); // No PersonClientAccess

      await expect(service.findOneForInspection('ext-tag-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw UnauthorizedException when user is not authenticated', async () => {
      const mockTag = createMockTag();

      // Mock forUser() to return an object with $currentUser()
      mockPrismaService.forUser.mockResolvedValue({
        $currentUser: jest.fn().mockReturnValue(null),
      });

      mockPrismaService.bypassRLS.mockReturnValue({
        tag: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(mockTag),
        },
        personClientAccess: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });

      mockClsService.get.mockReturnValue(undefined); // No user

      await expect(service.findOneForInspection('ext-tag-1')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return tag when tag has no client assigned', async () => {
      const mockTag = createMockTag({
        clientId: null,
        client: null,
      });
      const user = {
        idpId: 'user-idp-1',
        clientId: 'primary-client-ext',
      };

      setupMocks(mockTag, user);

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual(mockTag);
    });
  });

  describe('checkRegistration - multi-client access', () => {
    it('should allow access when user has secondary client access', async () => {
      const mockTag = {
        id: 'tag-1',
        externalId: 'ext-tag-1',
        clientId: 'secondary-client-internal',
        siteId: null,
        asset: null,
      };

      // Mock validateInspectionToken
      jest.spyOn(service, 'parseInspectionToken').mockReturnValue({
        serialNumber: 'SN123',
        tagExternalId: 'ext-tag-1',
        expiresOn: Date.now() + 3600000,
        timestamp: Date.now(),
        keyId: 'key-1',
        signature: 'sig',
      });

      mockAuthService.generateSignature.mockResolvedValue('sig');

      mockPrismaService.bypassRLS.mockReturnValue({
        tag: {
          findUnique: jest.fn().mockResolvedValue(mockTag),
        },
        personClientAccess: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'access-1',
            personId: 'person-1',
            clientId: 'secondary-client-internal',
          }),
        },
      });

      mockPrismaService.forUser.mockResolvedValue({
        $currentUser: jest.fn().mockReturnValue({
          clientId: 'primary-client-internal', // Different from tag
          siteId: 'site-1',
          hasMultiSiteVisibility: true,
          allowedSiteIdsStr: '',
        }),
      });

      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') {
          return {
            idpId: 'user-idp-1',
            clientId: 'primary-client-ext',
          };
        }
        return undefined;
      });

      const result = await service.checkRegistration('mock-token');

      expect(result).toEqual(mockTag);
    });
  });
});
