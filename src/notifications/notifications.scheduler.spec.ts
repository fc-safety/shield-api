import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NotificationsScheduler } from './notifications.scheduler';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from './lib/constants';

describe('NotificationsScheduler', () => {
  let provider: NotificationsScheduler;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnThis(),
    client: {
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsScheduler,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: getQueueToken(QUEUE_NAMES.CLIENT_NOTIFICATIONS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    provider = module.get<NotificationsScheduler>(NotificationsScheduler);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
