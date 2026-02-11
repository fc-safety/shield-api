import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { ApiClsService } from './api-cls.service';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockApiClsService = {
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockAuthService = {
    extractTokenFromRequest: jest.fn(),
    validateJwtToken: jest.fn(),
    getAccessGrantForUser: jest.fn(),
    extractOrganizationContextFromRequest: jest.fn(),
    savePersonFromUserData: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue([]),
  };

  const mockUser = {
    idpId: 'test-idp-id',
    email: 'test@example.com',
    username: 'testuser',
    givenName: 'Test',
    familyName: 'User',
  };

  const createMockContext = (headers: Record<string, string> = {}) => {
    const request = {
      headers,
      ip: '127.0.0.1',
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);

    // Default: not public, no skip
    mockReflector.getAllAndOverride.mockReturnValue(false);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('access intent validation', () => {
    beforeEach(() => {
      mockAuthService.extractTokenFromRequest.mockReturnValue('valid-token');
      mockAuthService.validateJwtToken.mockResolvedValue({
        isValid: true,
        user: mockUser,
      });
      mockAuthService.extractOrganizationContextFromRequest.mockReturnValue({
        requestedClientId: 'client-1',
        accessIntent: 'user',
      });
      mockAuthService.savePersonFromUserData.mockResolvedValue({
        id: 'person-1',
      });
    });

    it('should allow system intent with SYSTEM scope', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SYSTEM,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'system',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should throw 403 for system intent with non-SYSTEM scope', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.CLIENT,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'system',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw 403 for elevated intent with non-SYSTEM scope', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SITE,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'elevated',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw 400 for elevated intent without x-client-id', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SYSTEM,
          capabilities: ['perform-inspections'],
          clientId: '',
          siteId: '',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'elevated',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow elevated intent with SYSTEM scope and x-client-id', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SYSTEM,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'elevated',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow user intent for any scope', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SITE,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-access-intent': 'user',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should default to user intent when header is absent', async () => {
      mockAuthService.getAccessGrantForUser.mockResolvedValue({
        grant: {
          scope: RoleScope.SITE,
          capabilities: ['perform-inspections'],
          clientId: 'client-1',
          siteId: 'site-1',
        },
      });

      const context = createMockContext({
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });
});
