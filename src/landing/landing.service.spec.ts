import { Test, TestingModule } from '@nestjs/testing';
import { LandingService } from './landing.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { HttpService } from '@nestjs/axios';
import { SettingsService } from 'src/settings/settings.service';

describe('LandingService', () => {
  let service: LandingService;

  const mockNotificationsService = {
    queueEmail: jest.fn(),
  };

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockSettingsService = {
    getGlobalSettings: jest.fn().mockResolvedValue({
      data: { landingFormLeadToAddress: 'test@example.com' },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandingService,
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<LandingService>(LandingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
