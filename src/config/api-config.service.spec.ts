import { Test, TestingModule } from '@nestjs/testing';
import { ApiConfigService } from './api-config.service';
import { ConfigService } from '@nestjs/config';

describe('ApiConfigService', () => {
  let service: ApiConfigService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiConfigService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ApiConfigService>(ApiConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
