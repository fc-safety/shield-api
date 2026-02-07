import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { ClsService } from 'nestjs-cls';
import { UsersService } from 'src/clients/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ClientsService } from 'src/clients/clients/clients.service';

describe('SupportService', () => {
  let service: SupportService;

  const mockApiConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockPrismaService = {
    bypassRLS: jest.fn().mockReturnValue({
      client: {
        findFirst: jest.fn(),
      },
    }),
  };

  const mockClientsService = {
    getPrimaryClientAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: ApiConfigService, useValue: mockApiConfigService },
        { provide: ClsService, useValue: mockClsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClientsService, useValue: mockClientsService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
