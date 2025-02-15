import { Injectable } from '@nestjs/common';
import { ProductRequestStatus } from '@prisma/client';
import { ViewContext } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
import { QueryOrderRequestDto } from './dto/query-order-request.dto';
import { UpdateOrderRequestStatusDto } from './dto/update-order-request-status.dto';
import { UpdateOrderRequestDto } from './dto/update-order-request.dto';

@Injectable()
export class OrderRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateOrderRequestDto) {
    return this.prisma.forUser().then((client) =>
      client.productRequest.create({
        data,
        include: {
          productRequestItems: true,
          asset: true,
        },
      }),
    );
  }

  async findAll(query?: QueryOrderRequestDto, context?: ViewContext) {
    const getClient =
      context === 'admin'
        ? this.prisma.forAdminOrUser()
        : this.prisma.forUser();

    return getClient.then((client) =>
      client.productRequest.findManyForPage(
        buildPrismaFindArgs<typeof client.productRequest>(query, {
          include: {
            productRequestItems: {
              include: {
                product: true,
              },
            },
            productRequestApprovals: true,
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
            client: context === 'admin',
            site: context === 'admin',
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.forUser().then((client) =>
      client.productRequest.findUnique({
        where: { id },
        include: {
          productRequestItems: true,
          asset: {
            include: {
              product: {
                include: {
                  productCategory: true,
                },
              },
            },
          },
        },
      }),
    );
  }

  async update(id: string, data: UpdateOrderRequestDto) {
    return this.prisma.forUser().then((client) =>
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
    return this.prisma.forUser().then((client) =>
      client.productRequest.delete({
        where: { id },
      }),
    );
  }

  async updateStatuses(data: UpdateOrderRequestStatusDto) {
    return this.prisma.forAdminOrUser().then((client) =>
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
    return this.prisma.forAdminOrUser().then((client) =>
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
}
