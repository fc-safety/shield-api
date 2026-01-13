import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ClientNotificationsProcessor } from './client-notifications.processor';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from 'src/clients/users/users.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { QUEUE_NAMES } from '../lib/constants';

describe('ClientNotificationsProcessor', () => {
  let provider: ClientNotificationsProcessor;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnThis(),
    client: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    asset: {
      findMany: jest.fn(),
    },
    site: {
      findMany: jest.fn(),
    },
    consumable: {
      findMany: jest.fn(),
    },
    alert: {
      findUniqueOrThrow: jest.fn(),
    },
    build: jest.fn(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
    close: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientNotificationsProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: getQueueToken(QUEUE_NAMES.CLIENT_NOTIFICATIONS),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.SEND_NOTIFICATIONS),
          useValue: mockQueue,
        },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    provider = module.get<ClientNotificationsProcessor>(
      ClientNotificationsProcessor,
    );
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
