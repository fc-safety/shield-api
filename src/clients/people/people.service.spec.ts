import { Test, TestingModule } from '@nestjs/testing';
import { PeopleService } from './people.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { ClsService } from 'nestjs-cls';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ModuleRef } from '@nestjs/core';

describe('PeopleService', () => {
  let service: PeopleService;

  const mockKeycloakService = {
    events: {
      users: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    },
    findUserById: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockModuleRef = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeopleService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: ClsService, useValue: mockClsService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<PeopleService>(PeopleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
