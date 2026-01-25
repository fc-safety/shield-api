import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { StatelessUser } from 'src/auth/user.schema';
import { ClientsService } from '../clients/clients.service';
import { SitesService } from '../sites/sites.service';
import { ActiveClientGuard } from './active-client.guard';

describe('ActiveClientGuard', () => {
  let guard: ActiveClientGuard;
  let mockClientsService: any;
  let mockSitesService: any;
  let mockClsService: any;
  let mockReflector: any;

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  const createMockUser = (overrides: Partial<StatelessUser> = {}) =>
    ({
      idpId: 'keycloak-user-123',
      email: 'test@example.com',
      username: 'testuser',
      clientId: 'primary-client-ext',
      siteId: 'primary-site-ext',
      visibility: 'self' as const,
      permissions: [],
      ...overrides,
    }) as StatelessUser;

  beforeEach(async () => {
    mockClientsService = {
      getClientStatus: jest.fn(),
      validateClientAccess: jest.fn(),
    };

    mockSitesService = {
      getSiteStatus: jest.fn(),
    };

    mockClsService = {
      get: jest.fn(),
    };

    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActiveClientGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: ClsService, useValue: mockClsService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: SitesService, useValue: mockSitesService },
      ],
    }).compile();

    guard = module.get<ActiveClientGuard>(ActiveClientGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('without x-client-id header (primary client)', () => {
    it('should allow access when client and site are active', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return undefined;
        return undefined;
      });
      mockClientsService.getClientStatus.mockResolvedValue('ACTIVE');
      mockSitesService.getSiteStatus.mockResolvedValue(true);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
      expect(mockClientsService.getClientStatus).toHaveBeenCalledWith(
        'primary-client-ext',
      );
      expect(mockSitesService.getSiteStatus).toHaveBeenCalledWith(
        'primary-site-ext',
      );
    });

    it('should throw ForbiddenException when client is not active', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return undefined;
        return undefined;
      });
      mockClientsService.getClientStatus.mockResolvedValue('INACTIVE');

      await expect(
        guard.canActivate(createMockExecutionContext()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when site is not active', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return undefined;
        return undefined;
      });
      mockClientsService.getClientStatus.mockResolvedValue('ACTIVE');
      mockSitesService.getSiteStatus.mockResolvedValue(false);

      await expect(
        guard.canActivate(createMockExecutionContext()),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('with x-client-id header (switching clients)', () => {
    it('should allow access when user has PersonClientAccess for the switched client', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return 'secondary-client-ext';
        return undefined;
      });
      mockClientsService.validateClientAccess.mockResolvedValue(
        'secondary-site-ext',
      );
      mockClientsService.getClientStatus.mockResolvedValue('ACTIVE');
      mockSitesService.getSiteStatus.mockResolvedValue(true);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
      expect(mockClientsService.validateClientAccess).toHaveBeenCalledWith(
        'keycloak-user-123',
        'secondary-client-ext',
      );
      expect(mockClientsService.getClientStatus).toHaveBeenCalledWith(
        'secondary-client-ext',
      );
      expect(mockSitesService.getSiteStatus).toHaveBeenCalledWith(
        'secondary-site-ext',
      );
    });

    it('should throw ForbiddenException when user does not have access to switched client', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return 'unauthorized-client-ext';
        return undefined;
      });
      mockClientsService.validateClientAccess.mockResolvedValue(null);

      await expect(
        guard.canActivate(createMockExecutionContext()),
      ).rejects.toThrow(
        new ForbiddenException({
          message: 'You do not have access to the requested client.',
          error: 'client_access_denied',
          statusCode: 403,
        }),
      );
    });

    it('should not call validateClientAccess when activeClientId matches primary client', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        // activeClientId same as user.clientId
        if (key === 'activeClientId') return 'primary-client-ext';
        return undefined;
      });
      mockClientsService.getClientStatus.mockResolvedValue('ACTIVE');
      mockSitesService.getSiteStatus.mockResolvedValue(true);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
      expect(mockClientsService.validateClientAccess).not.toHaveBeenCalled();
      // Should use primary client/site from user
      expect(mockClientsService.getClientStatus).toHaveBeenCalledWith(
        'primary-client-ext',
      );
      expect(mockSitesService.getSiteStatus).toHaveBeenCalledWith(
        'primary-site-ext',
      );
    });

    it('should throw ForbiddenException when switched client is not active', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return 'secondary-client-ext';
        return undefined;
      });
      mockClientsService.validateClientAccess.mockResolvedValue(
        'secondary-site-ext',
      );
      mockClientsService.getClientStatus.mockResolvedValue('INACTIVE');

      await expect(
        guard.canActivate(createMockExecutionContext()),
      ).rejects.toThrow(
        new ForbiddenException({
          message: 'Client is not active. Please contact support.',
          error: 'client_not_active',
          statusCode: 403,
        }),
      );
    });

    it('should throw ForbiddenException when switched site is not active', async () => {
      const user = createMockUser();
      mockClsService.get.mockImplementation((key: string) => {
        if (key === 'user') return user;
        if (key === 'activeClientId') return 'secondary-client-ext';
        return undefined;
      });
      mockClientsService.validateClientAccess.mockResolvedValue(
        'secondary-site-ext',
      );
      mockClientsService.getClientStatus.mockResolvedValue('ACTIVE');
      mockSitesService.getSiteStatus.mockResolvedValue(false);

      await expect(
        guard.canActivate(createMockExecutionContext()),
      ).rejects.toThrow(
        new ForbiddenException({
          message: 'Site is not active. Please contact support.',
          error: 'site_not_active',
          statusCode: 403,
        }),
      );
    });
  });

  describe('public endpoints', () => {
    it('should allow access to public endpoints without checking client', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(true);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(true);
      expect(mockClientsService.getClientStatus).not.toHaveBeenCalled();
    });
  });

  describe('missing user', () => {
    it('should return false when user is not set in CLS', async () => {
      mockClsService.get.mockReturnValue(undefined);

      const result = await guard.canActivate(createMockExecutionContext());

      expect(result).toBe(false);
    });
  });
});
