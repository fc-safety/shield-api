import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.tag.create({ data: createTagDto }));
  }

  async findAll(queryTagDto?: QueryTagDto) {
    return this.prisma.forUser().then(async (prisma) =>
      prisma.tag.findManyForPage(
        buildPrismaFindArgs<typeof prisma.tag>(queryTagDto, {
          include: {
            asset: true,
            client: true,
            site: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.tag.findUniqueOrThrow({
          where: { id },
          include: {
            asset: true,
            client: true,
            site: true,
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findOneByExternalId(externalId: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.tag.findFirstOrThrow({
          where: { externalId },
          include: {
            asset: {
              include: {
                product: {
                  include: {
                    productCategory: {
                      include: {
                        assetQuestions: true,
                      },
                    },
                    manufacturer: true,
                    assetQuestions: true,
                  },
                },
                setupQuestionResponses: true,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.tag
        .update({
          where: { id },
          data: updateTagDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.tag.delete({ where: { id } }));
  }
}
