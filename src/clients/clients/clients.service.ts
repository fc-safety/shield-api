import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.client.create({ data: createClientDto }));
  }

  async findAll(queryClientDto: QueryClientDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.client.findManyForPage(
        buildPrismaFindArgs<typeof this.prisma.client>(queryClientDto, {
          include: {
            address: true,
            _count: {
              select: { sites: true },
            },
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.forContext().then((prisma) =>
      prisma.client
        .findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            sites: {
              include: {
                address: true,
                _count: { select: { subsites: true } },
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.client
        .update({
          where: { id },
          data: updateClientDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.client.delete({ where: { id } }));
  }
}
