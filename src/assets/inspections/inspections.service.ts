import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: AssetsService,
  ) {}

  async create(createInspectionDto: CreateInspectionDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspection
        .create({
          data: createInspectionDto,
          include: {
            responses: {
              include: {
                assetQuestion: {
                  include: {
                    assetAlertCriteria: true,
                  },
                },
              },
            },
            asset: {
              include: {
                setupQuestionResponses: {
                  include: {
                    assetQuestion: {
                      include: {
                        consumableConfig: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
        .then(async (inspection) => {
          await this.assetsService.handleAlertTriggers(inspection);
          await this.assetsService.handleConsumableConfigs(
            prisma,
            inspection.asset,
          );
          return inspection;
        }),
    );
  }

  async findAll(queryInspectionDto?: QueryInspectionDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspection.findManyForPage(
        buildPrismaFindArgs<typeof prisma.inspection>(queryInspectionDto, {
          include: {
            asset: {
              include: {
                product: {
                  include: {
                    productCategory: true,
                  },
                },
              },
            },
            inspector: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.inspection.findUniqueOrThrow({
          where: { id },
          include: {
            asset: {
              include: {
                product: {
                  include: {
                    productCategory: true,
                  },
                },
              },
            },
            inspector: true,
            responses: {
              include: {
                assetQuestion: true,
              },
            },
          },
        }),
      )
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
