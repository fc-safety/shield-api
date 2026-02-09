import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ApiClsService, useValue: mockApiClsService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
