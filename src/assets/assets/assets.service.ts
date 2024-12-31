import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryAssetDto } from './dto/query-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAssetDto: Prisma.AssetCreateInput) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.asset.create({ data: createAssetDto }));
  }

  async findAll(queryAssetDto?: QueryAssetDto) {
    return this.prisma.forUser().then(async (prisma) =>
      prisma.asset.findManyForPage(
        buildPrismaFindArgs<typeof prisma.asset>(queryAssetDto, {
          include: {
            product: {
              include: {
                manufacturer: true,
                productCategory: true,
              },
            },
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.asset.findUniqueOrThrow({
          where: { id },
          include: {
            product: {
              include: {
                manufacturer: true,
                productCategory: true,
              },
            },
            inspections: {
              include: {
                inspector: true,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.asset
        .update({
          where: { id },
          data: updateAssetDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) => prisma.asset.delete({ where: { id } }));
  }
}
