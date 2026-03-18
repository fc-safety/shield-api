import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigService } from 'src/config/api-config.service';
import { RoleScope } from 'src/generated/prisma/client';
import { ApiClsService } from './api-cls.service';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

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
    resolveRequestAccess: jest.fn(),
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
    const baseResolvedAccess = {
      user: mockUser,
      person: { id: 'person-1' },
      accessGrant: {
        scope: RoleScope.SYSTEM,
        capabilities: ['perform-inspections'],
        clientId: 'client-1',
        siteId: 'site-1',
      },
      accessIntent: 'user' as const,
      accessContext: { kind: 'tenant' as const },
    };

    beforeEach(() => {
      mockAuthService.resolveRequestAccess.mockResolvedValue(baseResolvedAccess);
    });

    it('should delegate request access resolution to AuthService', async () => {
      const context = createMockContext({
        authorization: 'Bearer valid-token',
        'x-client-id': 'client-1',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockAuthService.resolveRequestAccess).toHaveBeenCalledWith({
        request: expect.any(Object),
        allowPublic: false,
        skipAccessGrantValidation: false,
      });
    });

    it('should rethrow resolver errors', async () => {
      mockAuthService.resolveRequestAccess.mockResolvedValue({
        ...baseResolvedAccess,
        error: new ForbiddenException('forbidden'),
      });
      const context = createMockContext();

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should write resolved access context to CLS', async () => {
      const context = createMockContext();
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockApiClsService.set).toHaveBeenCalledWith(
        'accessContext',
        expect.objectContaining({ kind: 'tenant' }),
      );
      expect(mockApiClsService.set).toHaveBeenCalledWith('accessContext', {
        kind: 'tenant',
      });
    });

    it('should support public requests from resolver output', async () => {
      mockAuthService.resolveRequestAccess.mockResolvedValue({
        user: null,
        person: null,
        accessGrant: null,
        accessIntent: 'user',
        accessContext: { kind: 'public' },
      });
      mockReflector.getAllAndOverride.mockImplementation((key: string) => {
        if (key === 'isPublic') return true;
        return false;
      });
      const context = createMockContext();

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(mockApiClsService.set).toHaveBeenCalledWith('accessContext', {
        kind: 'public',
      });
    });
  });
});
