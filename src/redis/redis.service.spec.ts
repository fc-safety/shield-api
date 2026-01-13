import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ApiConfigService } from 'src/config/api-config.service';

describe('RedisService', () => {
  let service: RedisService;

  const mockApiConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      const mockValues: Record<string, any> = {
        KV_STORE_HOST: 'localhost',
        KV_STORE_PORT: 6379,
        KV_STORE_CONNECT_TIMEOUT: 5000,
      };
      return mockValues[key] || 'test-value';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
