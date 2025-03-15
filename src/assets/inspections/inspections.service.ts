import { Injectable } from '@nestjs/common';
import { InspectionSessionStatus } from '@prisma/client';
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

  async create(
    createInspectionDto: CreateInspectionDto,
    sessionId?: string,
    routeId?: string,
  ) {
    const prisma = await this.prisma.forUser();
    const assetId = createInspectionDto.asset.connect.id;

    const inspectionSession = sessionId
      ? await prisma.inspectionSession
          .findUniqueOrThrow({
            where: { id: sessionId },
            include: {
              inspectionRoute: {
                include: {
                  inspectionRoutePoints: {
                    where: {
                      assetId: assetId,
                    },
                  },
                },
              },
            },
          })
          .catch(as404OrThrow)
      : null;

    if (inspectionSession) {
      const currentUser = prisma.$currentUser();
      if (currentUser.id !== inspectionSession.lastInspectorId) {
        await prisma.inspectionSession.update({
          where: { id: inspectionSession.id },
          data: { lastInspectorId: currentUser.id },
        });
      }
    }

    const currentRoutePoint =
      inspectionSession?.inspectionRoute.inspectionRoutePoints.find(
        (point) => point.assetId === assetId,
      ) ??
      (routeId
        ? await prisma.inspectionRoutePoint.findFirst({
            where: {
              assetId,
              inspectionRouteId: routeId,
            },
          })
        : null) ??
      null;

    const inspection = await prisma.inspection.create({
      data: {
        ...createInspectionDto,
        completedInspectionRoutePoints: currentRoutePoint
          ? {
              create: {
                inspectionRoutePoint: {
                  connect: {
                    id: currentRoutePoint.id,
                  },
                },
                inspectionSession: sessionId
                  ? {
                      connect: {
                        id: sessionId,
                      },
                    }
                  : {
                      create: {
                        inspectionRoute: {
                          connect: {
                            id: currentRoutePoint.inspectionRouteId,
                          },
                        },
                      },
                    },
              },
            }
          : undefined,
      },
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
        completedInspectionRoutePoints: {
          include: {
            inspectionSession: true,
          },
          take: 1,
        },
      },
    });

    await this.assetsService.handleAlertTriggers(inspection);
    await this.assetsService.handleConsumableConfigs(prisma, inspection.asset);

    return {
      inspection,
      session:
        inspection.completedInspectionRoutePoints.at(0)?.inspectionSession ??
        null,
    };
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
            alerts: {
              include: {
                assetQuestionResponse: {
                  include: {
                    assetQuestion: true,
                  },
                },
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

  async findActiveInspectionSessionsForAsset(assetId: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspectionSession.findMany({
        where: {
          inspectionRoute: {
            inspectionRoutePoints: {
              some: {
                assetId,
              },
            },
          },
          status: InspectionSessionStatus.PENDING,
        },
        include: {
          lastInspector: true,
          completedInspectionRoutePoints: {
            include: {
              inspectionRoutePoint: true,
            },
          },
          inspectionRoute: {
            include: {
              inspectionRoutePoints: true,
            },
          },
        },
      }),
    );
  }

  async findInspectionSession(id: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspectionSession
        .findUniqueOrThrow({
          where: { id },
          include: {
            inspectionRoute: {
              include: {
                inspectionRoutePoints: true,
              },
            },
            completedInspectionRoutePoints: {
              include: {
                inspectionRoutePoint: true,
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async completeInspectionSession(id: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspectionSession.update({
        where: { id },
        data: { status: InspectionSessionStatus.COMPLETE },
      }),
    );
  }
}
