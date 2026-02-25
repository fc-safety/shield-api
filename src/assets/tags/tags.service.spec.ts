import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { AuthService } from 'src/auth/auth.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
  let service: TagsService;
  let mockPrismaService: any;
  let mockApiClsService: any;

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockAuthService = {
    generateSignedUrl: jest.fn(),
    validateSignedUrl: jest.fn(),
    generateSignature: jest.fn().mockResolvedValue('mock-signature'),
  };

  const createMockUser = (overrides: any = {}) => ({
    idpId: 'user-idp-1',
    email: 'test@example.com',
    username: 'testuser',
    givenName: 'Test',
    familyName: 'User',
    ...overrides,
  });

  const createMockTag = (overrides: any = {}) => ({
    id: 'tag-1',
    externalId: 'ext-tag-1',
    clientId: 'client-1',
    siteId: 'site-1',
    client: { id: 'client-1', name: 'Client One' },
    site: { id: 'site-1', name: 'Site One' },
    asset: null,
    ...overrides,
  });

  const createMockAccessRecord = (overrides: any = {}) => ({
    client: { id: 'client-1', name: 'Client One' },
    site: { id: 'site-1', name: 'Site One' },
    role: { scope: RoleScope.SITE },
    ...overrides,
  });

  beforeEach(async () => {
    mockPrismaService = {
      forContext: jest.fn(),
      forUser: jest.fn(),
      build: jest.fn(),
      bypassRLS: jest.fn(),
      getAllowedSiteIdsForSite: jest.fn(),
    };

    mockApiClsService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOneForInspection', () => {
    const setupMocks = ({
      tag,
      user,
      accessRecords = [],
    }: {
      tag: any;
      user: any;
      accessRecords?: any[];
    }) => {
      mockPrismaService.bypassRLS.mockReturnValue({
        tag: {
          findUniqueOrThrow: jest.fn().mockResolvedValue(tag),
        },
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(accessRecords),
        },
      });

      mockApiClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        return undefined;
      });
    };

    it('should return { tag, accessContext } when user has direct site access', async () => {
      const tag = createMockTag();
      const user = createMockUser();
      const accessRecords = [createMockAccessRecord()];

      setupMocks({ tag, user, accessRecords });

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
    });

    it('should return { tag, accessContext } when user has CLIENT scope access', async () => {
      const tag = createMockTag({ siteId: 'other-site' });
      const user = createMockUser();
      const accessRecords = [
        createMockAccessRecord({ role: { scope: RoleScope.CLIENT } }),
      ];

      setupMocks({ tag, user, accessRecords });

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
    });

    it('should return { tag, accessContext } when user has SITE_GROUP scope with matching subsite', async () => {
      const tag = createMockTag({ siteId: 'subsite-1' });
      const user = createMockUser();
      const accessRecords = [
        createMockAccessRecord({ role: { scope: RoleScope.SITE_GROUP } }),
      ];

      setupMocks({ tag, user, accessRecords });
      mockPrismaService.getAllowedSiteIdsForSite.mockResolvedValue([
        'site-1',
        'subsite-1',
        'subsite-2',
      ]);

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
      expect(mockPrismaService.getAllowedSiteIdsForSite).toHaveBeenCalledWith(
        'site-1',
      );
    });

    it('should throw ForbiddenException when user has no client access', async () => {
      const tag = createMockTag({
        clientId: 'other-client',
        client: { id: 'other-client', name: 'Other Client' },
      });
      const user = createMockUser();

      setupMocks({ tag, user, accessRecords: [] });

      await expect(service.findOneForInspection('ext-tag-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user has client access but not site access', async () => {
      const tag = createMockTag({ siteId: 'restricted-site' });
      const user = createMockUser();
      const accessRecords = [
        createMockAccessRecord({ role: { scope: RoleScope.SITE } }),
      ];

      setupMocks({ tag, user, accessRecords });

      await expect(service.findOneForInspection('ext-tag-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      const tag = createMockTag();

      setupMocks({ tag, user: undefined });

      await expect(service.findOneForInspection('ext-tag-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return { tag, accessContext: null } for unregistered tag (no clientId)', async () => {
      const tag = createMockTag({ clientId: null, client: null });
      const user = createMockUser();

      setupMocks({ tag, user });

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual({ tag, accessContext: null });
    });

    it('should return accessContext when tag has no site (any client access is sufficient)', async () => {
      const tag = createMockTag({ siteId: null, site: null });
      const user = createMockUser();
      const accessRecords = [createMockAccessRecord()];

      setupMocks({ tag, user, accessRecords });

      const result = await service.findOneForInspection('ext-tag-1');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
    });
  });

  describe('findOneForAssetSetup', () => {
    const setupMocks = ({
      tag,
      user,
      accessRecords = [],
    }: {
      tag: any;
      user: any;
      accessRecords?: any[];
    }) => {
      mockPrismaService.bypassRLS.mockReturnValue({
        tag: {
          findFirstOrThrow: jest.fn().mockResolvedValue(tag),
        },
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(accessRecords),
        },
      });

      mockApiClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        return undefined;
      });
    };

    it('should return { tag, accessContext } when user has access', async () => {
      const tag = createMockTag();
      const user = createMockUser();
      const accessRecords = [createMockAccessRecord()];

      setupMocks({ tag, user, accessRecords });

      const result = await service.findOneForAssetSetup('ext-tag-1');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
    });

    it('should throw ForbiddenException when user lacks access', async () => {
      const tag = createMockTag();
      const user = createMockUser();

      setupMocks({ tag, user, accessRecords: [] });

      await expect(service.findOneForAssetSetup('ext-tag-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return { tag, accessContext: null } for unregistered tag', async () => {
      const tag = createMockTag({ clientId: null, client: null });
      const user = createMockUser();

      setupMocks({ tag, user });

      const result = await service.findOneForAssetSetup('ext-tag-1');

      expect(result).toEqual({ tag, accessContext: null });
    });
  });

  describe('checkRegistration', () => {
    const setupMocks = ({
      tag,
      user,
      accessRecords = [],
    }: {
      tag: any;
      user: any;
      accessRecords?: any[];
    }) => {
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
          findUnique: jest.fn().mockResolvedValue(tag),
        },
        personClientAccess: {
          findMany: jest.fn().mockResolvedValue(accessRecords),
        },
      });

      mockApiClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        return undefined;
      });
    };

    it('should return { tag, accessContext } when user has access to registered tag', async () => {
      const tag = createMockTag();
      const user = createMockUser();
      const accessRecords = [createMockAccessRecord()];

      setupMocks({ tag, user, accessRecords });

      const result = await service.checkRegistration('mock-token');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'client-1',
          clientName: 'Client One',
          siteId: 'site-1',
          siteName: 'Site One',
        },
      });
    });

    it('should return { tag: null, accessContext: null } when tag does not exist', async () => {
      const user = createMockUser();

      setupMocks({ tag: null, user });

      const result = await service.checkRegistration('mock-token');

      expect(result).toEqual({ tag: null, accessContext: null });
    });

    it('should return { tag, accessContext: null } when tag has no client', async () => {
      const tag = createMockTag({ clientId: null, client: null });
      const user = createMockUser();

      setupMocks({ tag, user });

      const result = await service.checkRegistration('mock-token');

      expect(result).toEqual({ tag, accessContext: null });
    });

    it('should throw ForbiddenException when user lacks access to tag client', async () => {
      const tag = createMockTag({
        clientId: 'other-client',
        client: { id: 'other-client', name: 'Other' },
      });
      const user = createMockUser();

      setupMocks({ tag, user, accessRecords: [] });

      await expect(service.checkRegistration('mock-token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when user has secondary client access', async () => {
      const tag = createMockTag({
        clientId: 'secondary-client',
        client: { id: 'secondary-client', name: 'Secondary Client' },
        siteId: null,
        site: null,
      });
      const user = createMockUser();
      const accessRecords = [
        createMockAccessRecord({
          client: { id: 'secondary-client', name: 'Secondary Client' },
          site: { id: 'secondary-site', name: 'Secondary Site' },
        }),
      ];

      setupMocks({ tag, user, accessRecords });

      const result = await service.checkRegistration('mock-token');

      expect(result).toEqual({
        tag,
        accessContext: {
          clientId: 'secondary-client',
          clientName: 'Secondary Client',
          siteId: 'secondary-site',
          siteName: 'Secondary Site',
        },
      });
    });
  });
});
