import { Test, TestingModule } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { UsersService } from 'src/clients/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConsumablesService } from '../consumables/consumables.service';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  let service: AssetsService;

  const mockPrismaService = {
    forContext: jest.fn().mockResolvedValue({
      asset: {
        create: jest.fn(),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $rlsContext: jest.fn(),
    }),
  };

  const mockConsumablesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockNotificationsService = {
    sendNotifications: jest.fn(),
  };

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  const mockClsService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConsumablesService, useValue: mockConsumablesService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
