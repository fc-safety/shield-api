import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { RedisService } from 'src/redis/redis.service';
import { AuthService } from 'src/auth/auth.service';

describe('EventsService', () => {
  let service: EventsService;

  const mockApiClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedisService = {
    getPublisher: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
      pSubscribe: jest.fn(),
      unsubscribe: jest.fn(),
      pUnsubscribe: jest.fn(),
    }),
  };

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ApiClsService, useValue: mockApiClsService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
