import { Injectable, Logger } from '@nestjs/common';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ProductRequestStatus } from 'src/generated/prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { QueryProductRequestDto } from './dto/query-product-request.dto';
import { ReviewProductRequestDto } from './dto/review-product-request.dto';
import { UpdateProductRequestStatusDto } from './dto/update-product-request-status.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';

@Injectable()
export class ProductRequestsService {
  private readonly logger = new Logger(ProductRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(data: CreateProductRequestDto) {
    return this.prisma.build().then((client) =>
      client.productRequest
        .create({
          data,
        })
        .then(async (productRequest) => {
          await this.notifications.queueNewProductRequestEmail(
            productRequest.id,
          );
          return productRequest;
        }),
    );
  }

  async findAll(query?: QueryProductRequestDto) {
    return this.prisma.build().then((prisma) =>
      prisma.productRequest.findManyForPage(
        buildPrismaFindArgs<typeof prisma.productRequest>(query, {
          include: {
            productRequestItems: {
              include: {
                product: true,
              },
            },
            productRequestApprovals: {
              include: {
                approver: true,
              },
            },
            asset: {
              include: {
                product: {
                  include: {
                    productCategory: true,
                  },
                },
              },
            },
            requestor: true,
            client: prisma.$viewContext === 'admin',
            site: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.build().then((client) =>
      client.productRequest.findUnique({
        where: { id },
        include: {
          productRequestItems: {
            include: {
              product: true,
            },
          },
          productRequestApprovals: {
            include: {
              approver: true,
            },
          },
          asset: {
            include: {
              product: {
                include: {
                  productCategory: true,
                },
              },
            },
          },
          requestor: true,
          client: true,
          site: true,
        },
      }),
    );
  }

  async update(id: string, data: UpdateProductRequestDto) {
    return this.prisma.build().then((client) =>
      client.productRequest.update({
        where: { id },
        data,
        include: {
          productRequestItems: true,
          asset: true,
        },
      }),
    );
  }

  async remove(id: string) {
    return this.prisma.build().then((client) =>
      client.productRequest.delete({
        where: { id },
      }),
    );
  }

  async updateStatuses(data: UpdateProductRequestStatusDto) {
    return this.prisma.build().then((client) =>
      client.productRequest.updateMany({
        where: {
          id: {
            in: data.ids,
          },
          status: {
            notIn: [
              ProductRequestStatus.CANCELLED,
              ProductRequestStatus.COMPLETE,
            ],
          },
        },
        data: { status: data.status },
      }),
    );
  }

  async cancel(id: string) {
    return this.prisma.build().then((client) =>
      client.productRequest.update({
        where: {
          id,
          status: {
            in: [
              ProductRequestStatus.NEW,
              ProductRequestStatus.APPROVED,
              ProductRequestStatus.RECEIVED,
            ],
          },
        },
        data: { status: ProductRequestStatus.CANCELLED },
      }),
    );
  }

  async review(id: string, data: ReviewProductRequestDto) {
    return this.prisma.build().then((client) =>
      client.productRequest.update({
        where: { id },
        data,
      }),
    );
  }
}
