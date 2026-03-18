import { Test, TestingModule } from '@nestjs/testing';
import { ProductRequestsService } from './product-requests.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/notifications/notifications.service';

describe('ProductRequestsService', () => {
  let service: ProductRequestsService;
  const mockFindManyForPage = jest.fn();

  const mockPrismaService = {
    build: jest.fn().mockResolvedValue({
      $accessContextKind: 'tenant',
      productRequest: {
        create: jest.fn().mockResolvedValue({ id: 'test-id' }),
        findManyForPage: mockFindManyForPage,
        findUniqueOrThrow: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
      productRequestApprovals: {},
    }),
  };

  const mockNotificationsService = {
    queueNewProductRequestEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
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

  describe('findAll', () => {
    it('includes client relation only for system context', async () => {
      mockPrismaService.build.mockResolvedValue({
        $accessContextKind: 'system',
        productRequest: {
          findManyForPage: mockFindManyForPage.mockResolvedValue({
            results: [],
            count: 0,
          }),
        },
      });

      await service.findAll();

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            client: true,
          }),
        }),
      );
    });

    it('does not include client relation for tenant/support contexts', async () => {
      mockPrismaService.build.mockResolvedValue({
        $accessContextKind: 'support',
        productRequest: {
          findManyForPage: mockFindManyForPage.mockResolvedValue({
            results: [],
            count: 0,
          }),
        },
      });

      await service.findAll();

      expect(mockFindManyForPage).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            client: false,
          }),
        }),
      );
    });
  });
});
