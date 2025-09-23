import { Injectable } from '@nestjs/common';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryAlertDto } from './dto/query-alert.dto';
import { ResolveAlertDto } from './dto/resolve-alert.dto';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(queryAlertDto?: QueryAlertDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.alert.findManyForPage(
        buildPrismaFindArgs<typeof prisma.alert>(queryAlertDto, {
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
            assetAlertCriterion: true,
            assetQuestionResponse: {
              include: {
                assetQuestion: true,
              },
            },
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
        prisma.alert.findUniqueOrThrow({
          where: {
            id,
          },
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
            assetAlertCriterion: true,
            assetQuestionResponse: {
              include: {
                assetQuestion: true,
              },
            },
            inspection: {
              include: {
                inspector: true,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async resolveAlert(alertId: string, resolveAlertDto: ResolveAlertDto) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.alert.update({
          where: {
            id: alertId,
            resolved: false,
          },
          data: {
            ...resolveAlertDto,
            resolved: true,
            resolvedOn: new Date(),
            resolvedBy: {
              connect: {
                id: prisma.$currentUser()?.id,
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async attachInspectionImage(alertId: string, inspectionImageUrl: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.alert.update({
        where: { id: alertId },
        data: { inspectionImageUrl },
      }),
    );
  }
}
