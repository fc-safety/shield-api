import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { QuerySiteDto } from './dto/query-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SitesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSiteDto: CreateSiteDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.site.create({ data: createSiteDto }));
  }

  async findAll(querySiteDto?: QuerySiteDto) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) =>
        prisma.site.findManyForPage(
          buildPrismaFindArgs<typeof prisma.site>(querySiteDto),
        ),
      );
  }

  async findOne(id: string) {
    return this.prisma
      .forAdminOrUser()
      .then((prisma) => prisma.site.findUniqueOrThrow({ where: { id } }))
      .catch(as404OrThrow);
  }

  async update(id: string, updateSiteDto: UpdateSiteDto) {
    return this.prisma.forAdminOrUser().then((prisma) =>
      prisma.site
        .update({
          where: { id },
          data: updateSiteDto,
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
