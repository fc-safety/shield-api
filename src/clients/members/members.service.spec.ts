import { Test, TestingModule } from '@nestjs/testing';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { MembersService } from './members.service';

describe('MembersService', () => {
  let service: MembersService;

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue({
      person: {
        findManyForPage: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
      personClientAccess: {
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
    }),
  };

  const mockApiClsService = {
    requireAccessGrant: jest.fn().mockReturnValue({
      clientId: 'test-client-id',
    }),
  };

  const mockMemoryCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getOrSet: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
  };

  const mockKeycloakService = {
    client: {
      users: {
        resetPasswordEmail: jest.fn(),
      },
    },
  };

  const mockInvitationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: MemoryCacheService, useValue: mockMemoryCacheService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: KeycloakService, useValue: mockKeycloakService },
        { provide: InvitationsService, useValue: mockInvitationsService },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
