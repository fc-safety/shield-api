import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const mockClsService = {
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
        { provide: ClsService, useValue: mockClsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });
});
