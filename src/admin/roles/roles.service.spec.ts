import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { ClsService } from 'nestjs-cls';
import { RedisService } from 'src/redis/redis.service';

describe('RolesService', () => {
  let service: RolesService;

  const mockKeycloakService = {
    client: {
      clients: {
        find: jest.fn().mockResolvedValue([{ id: 'client-uuid' }]),
        findRole: jest.fn(),
        listRoles: jest.fn().mockResolvedValue([]),
      },
      groups: {
        find: jest.fn().mockResolvedValue([]),
        createChildGroup: jest.fn(),
        update: jest.fn(),
        del: jest.fn(),
        listSubGroups: jest.fn(),
        addClientRoleMappings: jest.fn(),
        delClientRoleMappings: jest.fn(),
      },
      setConfig: jest.fn(),
      auth: jest.fn(),
    },
    getOrCreateManagedRolesGroup: jest
      .fn()
      .mockResolvedValue({ id: 'group-id' }),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-audience'),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedisService = {
    getPublisher: jest.fn().mockReturnValue({
      get: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ClsService, useValue: mockClsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
