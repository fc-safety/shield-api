import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsProcessor } from './notifications.processor';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from '../notifications.service';

describe('NotificationsProcessor', () => {
  let provider: NotificationsProcessor;

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnThis(),
    productRequest: {
      findUniqueOrThrow: jest.fn(),
    },
  };

  const mockNotificationsService = {
    sendNewProductRequestEmail: jest.fn(),
    sendTemplateEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsProcessor,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    provider = module.get<NotificationsProcessor>(NotificationsProcessor);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
