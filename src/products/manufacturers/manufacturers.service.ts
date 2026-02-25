import { Injectable } from '@nestjs/common';
import { GENERIC_MANUFACTURER_NAME } from 'src/common/constants';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { QueryManufacturerDto } from './dto/query-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createManufacturerDto: CreateManufacturerDto) {
    return this.prisma.build().then((prisma) =>
      prisma.manufacturer.create({
        data: createManufacturerDto,
      }),
    );
  }

  async getOrCreateGeneric() {
    const prisma = this.prisma.bypassRLS();
    return prisma.manufacturer
      .findFirst({
        where: { name: GENERIC_MANUFACTURER_NAME },
      })
      .then((manufacturer) => {
        if (manufacturer) return manufacturer;
        return prisma.manufacturer.create({
          data: {
            name: GENERIC_MANUFACTURER_NAME,
          },
        });
      });
  }

  async findAll(queryManufacturerDto?: QueryManufacturerDto) {
    return this.prisma.build().then((prisma) =>
      prisma.manufacturer.findManyForPage(
        buildPrismaFindArgs<typeof prisma.manufacturer>(queryManufacturerDto, {
          include: {
            _count: {
              select: { products: true },
            },
            client: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma.build().then((prisma) =>
      prisma.manufacturer
        .findUniqueOrThrow({
          where: { id },
          include: {
            products: {
              include: { productCategory: true, client: true },
            },
            client: true,
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateManufacturerDto: UpdateManufacturerDto) {
    return this.prisma.build().then((prisma) =>
      prisma.manufacturer
        .update({
          where: { id },
          data: updateManufacturerDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .build()
      .then((prisma) => prisma.manufacturer.delete({ where: { id } }));
  }
}
