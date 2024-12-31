import { Injectable } from '@nestjs/common';
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
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.manufacturer.create({
        data: createManufacturerDto,
      }),
    );
  }

  async findAll(queryManufacturerDto?: QueryManufacturerDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) =>
        prisma.manufacturer.findManyForPage(
          buildPrismaFindArgs<typeof prisma.manufacturer>(queryManufacturerDto),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.manufacturer
        .findUniqueOrThrow({
          where: { id },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateManufacturerDto: UpdateManufacturerDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
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
      .forAdminOrUser()
      .then((prisma) => prisma.manufacturer.delete({ where: { id } }));
  }
}
