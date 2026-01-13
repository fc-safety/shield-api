import { Test, TestingModule } from '@nestjs/testing';
import {
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockPrismaHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockPrismaService = {};

  const mockApiConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: HttpHealthIndicator, useValue: mockHttpHealthIndicator },
        { provide: PrismaHealthIndicator, useValue: mockPrismaHealthIndicator },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ApiConfigService, useValue: mockApiConfigService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
