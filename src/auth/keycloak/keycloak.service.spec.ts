import { Test, TestingModule } from '@nestjs/testing';
import { KeycloakService, KEYCLOAK_ADMIN_CLIENT } from './keycloak.service';
import { ApiConfigService } from 'src/config/api-config.service';

describe('KeycloakService', () => {
  let service: KeycloakService;

  const mockKeycloakAdminClient = {
    users: {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      del: jest.fn(),
      resetPasswordEmail: jest.fn(),
      makeRequest: jest.fn().mockReturnValue(jest.fn()),
      addToGroup: jest.fn(),
      delFromGroup: jest.fn(),
      listGroups: jest.fn(),
    },
    groups: {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      listMembers: jest.fn(),
      listSubGroups: jest.fn(),
      setOrCreateChild: jest.fn(),
    },
    clients: {
      find: jest.fn().mockResolvedValue([{ id: 'client-uuid' }]),
      findRole: jest.fn(),
      listRoles: jest.fn(),
    },
    setConfig: jest.fn(),
    auth: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeycloakService,
        { provide: KEYCLOAK_ADMIN_CLIENT, useValue: mockKeycloakAdminClient },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    service = module.get<KeycloakService>(KeycloakService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
