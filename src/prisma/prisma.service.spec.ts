import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { ClsService } from 'nestjs-cls';
import { RedisService } from 'src/redis/redis.service';
import { PeopleService } from 'src/clients/people/people.service';
import { PrismaAdapter } from './prisma.adapter';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRedisService = {
    getPublisher: jest.fn().mockReturnValue({
      get: jest.fn(),
      set: jest.fn(),
    }),
  };

  const mockPeopleService = {
    findByIdpId: jest.fn(),
  };

  const mockPrismaAdapter = {
    getConnectionUrl: jest
      .fn()
      .mockReturnValue('postgresql://localhost:5432/test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        { provide: ClsService, useValue: mockClsService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PeopleService, useValue: mockPeopleService },
        { provide: PrismaAdapter, useValue: mockPrismaAdapter },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
