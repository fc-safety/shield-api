import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { ClsService } from 'nestjs-cls';
import { RedisService } from 'src/redis/redis.service';
import { PeopleService } from 'src/clients/people/people.service';
import { AuthService } from 'src/auth/auth.service';

describe('EventsService', () => {
  let service: EventsService;

  const mockClsService = {
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

  const mockPeopleService = {
    findByIdpId: jest.fn(),
  };

  const mockAuthService = {
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: ClsService, useValue: mockClsService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PeopleService, useValue: mockPeopleService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
