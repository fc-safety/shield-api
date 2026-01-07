import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { RolesService } from 'src/admin/roles/roles.service';
import { ClsService } from 'nestjs-cls';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ApiConfigService } from 'src/config/api-config.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      person: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      client: {
        findUnique: jest.fn(),
      },
    }),
  };

  const mockKeycloakService = {
    findUsersByAttribute: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  };

  const mockRolesService = {
    getRole: jest.fn(),
    getRoles: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotifications: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-audience'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: ClsService, useValue: mockClsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
