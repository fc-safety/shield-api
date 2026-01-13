import { Test, TestingModule } from '@nestjs/testing';
import { ProductRequestsService } from './product-requests.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

describe('ProductRequestsService', () => {
  let service: ProductRequestsService;

  const mockPrismaService = {
    forUser: jest.fn().mockResolvedValue({
      productRequest: {
        create: jest.fn().mockResolvedValue({ id: 'test-id' }),
        findManyForPage: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
    }),
    forContext: jest.fn().mockResolvedValue({
      productRequest: {
        findManyForPage: jest.fn(),
      },
    }),
  };

  const mockNotificationsService = {
    queueNewProductRequestEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductRequestsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<ProductRequestsService>(ProductRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
