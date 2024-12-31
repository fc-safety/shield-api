import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createInspectionDto: CreateInspectionDto) {
    const data = {
      ...createInspectionDto,
      useragent: this.cls.get('useragent'),
      ipv4: this.cls.get('ipv4'),
      ipv6: this.cls.get('ipv6'),
      // TODO: grab location info
    };

    return this.prisma
      .forUser()
      .then((prisma) => prisma.inspection.create({ data }));
  }

  async findAll(queryInspectionDto?: QueryInspectionDto) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.inspection.findManyForPage(
          buildPrismaFindArgs<typeof prisma.inspection>(queryInspectionDto),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.inspection.findUniqueOrThrow({ where: { id } }))
      .catch(as404OrThrow);
  }

  async update(id: string, updateInspectionDto: UpdateInspectionDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspection
        .update({
          where: { id },
          data: updateInspectionDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.inspection.delete({ where: { id } }));
  }
}
