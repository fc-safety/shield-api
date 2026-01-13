import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { SettingsService } from 'src/settings/settings.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { getQueueToken } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './lib/constants';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockSettingsService = {
    getGlobalSettings: jest.fn().mockResolvedValue({
      data: { systemEmailFromAddress: 'test@example.com' },
    }),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockQueue = {
    add: jest.fn(),
    name: 'test-queue',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        {
          provide: getQueueToken(QUEUE_NAMES.SEND_NOTIFICATIONS),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.CLIENT_NOTIFICATIONS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
