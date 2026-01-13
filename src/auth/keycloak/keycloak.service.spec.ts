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

  describe('user event proxies error handling', () => {
    it('should not cause unhandled rejections when proxied user methods fail', async () => {
      let unhandledRejection: Error | null = null;

      const rejectionHandler = (reason: Error) => {
        unhandledRejection = reason;
      };
      process.on('unhandledRejection', rejectionHandler);

      // Test all proxied methods
      const proxiedMethods = [
        {
          name: 'create',
          mock: mockKeycloakAdminClient.users.create,
          call: () => service.client.users.create({} as any),
        },
        {
          name: 'update',
          mock: mockKeycloakAdminClient.users.update,
          call: () => service.client.users.update({ id: 'test' }, {} as any),
        },
        {
          name: 'del',
          mock: mockKeycloakAdminClient.users.del,
          call: () => service.client.users.del({ id: 'test' }),
        },
        {
          name: 'addToGroup',
          mock: mockKeycloakAdminClient.users.addToGroup,
          call: () =>
            service.client.users.addToGroup({ id: 'test', groupId: 'group' }),
        },
        {
          name: 'delFromGroup',
          mock: mockKeycloakAdminClient.users.delFromGroup,
          call: () =>
            service.client.users.delFromGroup({ id: 'test', groupId: 'group' }),
        },
      ];

      for (const { name, mock, call } of proxiedMethods) {
        const testError = new Error(`Keycloak ${name} failed`);
        mock.mockRejectedValueOnce(testError);

        // Call method and catch the error (as the caller would)
        await expect(call()).rejects.toThrow(testError);

        // Give time for any unhandled rejections to surface
        await new Promise((resolve) => setImmediate(resolve));

        // If error handlers are missing, this will fail
        expect(unhandledRejection).toBeNull();
      }

      process.off('unhandledRejection', rejectionHandler);
    });
  });
});
