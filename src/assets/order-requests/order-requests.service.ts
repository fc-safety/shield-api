import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderRequestDto } from './dto/create-order-request.dto';
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

  async findAll() {
    return this.prisma.forUser().then((client) =>
      client.productRequest.findMany({
        include: {
          productRequestItems: true,
          asset: true,
        },
      }),
    );
  }

  async findOne(id: string) {
    return this.prisma.forUser().then((client) =>
      client.productRequest.findUnique({
        where: { id },
        include: {
          productRequestItems: true,
          asset: true,
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
}
