import { BadRequestException, Injectable } from '@nestjs/common';
import { isBefore, subDays } from 'date-fns';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { InspectionSessionStatus } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { TagsService } from '../tags/tags.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { QueryInspectionDto } from './dto/query-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';

@Injectable()
export class InspectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetsService: AssetsService,
    private readonly tagsService: TagsService,
  ) {}

  async create(
    createInspectionDto: CreateInspectionDto,
    inspectionToken?: string,
    sessionId?: string,
    routeId?: string,
  ) {
    const prisma = await this.prisma.forUser();

    // IMPORTANT: Validate the inspection token before doing anything else.
    const tagValidationResult = await this.tagsService.validateInspectionToken(
      inspectionToken ?? '',
    );

    if (!tagValidationResult.isValid) {
      throw new BadRequestException(
        tagValidationResult.reason ?? 'Invalid tag',
      );
    }

    const assetId = createInspectionDto.asset.connect.id;

    // If a route session ID is provided, look it up. We'll look up the corresponding
    // route point here as well. This ensures that the session and route point are
    // tied together.
    const inspectionSessionPromise = sessionId
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
      : Promise.resolve(null);

    const [inspectionSession, asset] = await Promise.all([
      inspectionSessionPromise,
      prisma.asset
        .findUniqueOrThrow({
          where: { id: assetId },
          select: {
            siteId: true,
          },
        })
        .catch(as404OrThrow),
    ]);

    // If the route session exists but isn't owned by the current inspector,
    // update ownership.
    if (inspectionSession) {
      const currentUser = prisma.$currentUser();
      if (currentUser && currentUser.id !== inspectionSession.lastInspectorId) {
        await prisma.inspectionSession.update({
          where: { id: inspectionSession.id },
          data: { lastInspectorId: currentUser.id },
        });
      }
    }

    // Get the current route point that is tied to the asset that
    // was inspected.
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

    // Create the inspection while also updating route point completion.
    const inspection = await prisma.$transaction(async (tx) => {
      const inspection = await tx.inspection.create({
        data: {
          ...createInspectionDto,
          // IMPORTANT: Make sure the inspection is recorded under the site of the asset,
          // not necessarily the site of the inspector (which is the database default).
          site: {
            connect: {
              id: asset.siteId,
            },
          },
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
                  setAssetMetadataConfig: true,
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
            // A single inspection should only ever have one completed route point.
            take: 1,
          },
        },
      });

      await this.assetsService.handleAlertTriggers(tx, inspection);
      await this.assetsService.handleSetMetadataFromConfigs(
        tx,
        inspection.asset,
        inspection.responses,
      );

      return inspection;
    });

    return {
      inspection,
      session:
        inspection.completedInspectionRoutePoints.at(0)?.inspectionSession ??
        null,
    };
  }

  async findAll(queryInspectionDto?: QueryInspectionDto) {
    return this.prisma.forContext().then((prisma) =>
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
            site: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forContext()
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
    return this.prisma.forUser().then(async (prisma) => {
      const result = await prisma.inspectionSession.findMany({
        where: {
          inspectionRoute: {
            inspectionRoutePoints: {
              some: {
                assetId,
              },
            },
          },
          status: {
            in: [
              InspectionSessionStatus.PENDING,
              InspectionSessionStatus.EXPIRED,
            ],
          },
        },
        select: {
          id: true,
        },
      });

      const sessionIds = result.map((session) => session.id);

      // This should rarely be more than one session.
      const sessions = await Promise.all(
        sessionIds.map((id) => this.findInspectionSession(id)),
      );

      // Retrieving the individual sessions can mark the session as complete,
      // so let's post-filter here to make sure those don't slip through.
      return sessions.filter(
        (session) =>
          session.status === InspectionSessionStatus.PENDING ||
          session.status === InspectionSessionStatus.EXPIRED,
      );
    });
  }

  async findInspectionSession(id: string) {
    return this.prisma.forUser().then(async (prisma) => {
      const handleGetSession = async (sessionId: string) =>
        prisma.inspectionSession.findUniqueOrThrow({
          where: { id: sessionId },
          include: {
            client: true,
            lastInspector: true,
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
        });

      return handleGetSession(id)
        .catch(as404OrThrow)
        .then(async (session) => {
          // If session is not active, just return it.
          if (session.status !== InspectionSessionStatus.PENDING) {
            return session;
          }

          // If all route points have been completed, mark the session as complete and return it.
          const completedRoutePointIds =
            session.completedInspectionRoutePoints.map(
              (pointCompletion) => pointCompletion.inspectionRoutePointId,
            );
          if (
            session.inspectionRoute.inspectionRoutePoints.every((point) =>
              completedRoutePointIds.includes(point.id),
            )
          ) {
            await prisma.inspectionSession.update({
              where: { id: session.id },
              data: { status: InspectionSessionStatus.COMPLETE },
            });

            return handleGetSession(session.id);
          }

          // If session is active and not complete, determine if it should be expired. To do this,
          // we need to get all assets in the session's route and check if any of them have not been
          // inspected for the required cycle.
          const result = await prisma.asset.findMany({
            where: {
              inspectionCycle: {
                not: null,
              },
              inspectionRoutePoints: {
                some: {
                  completedInspectionRoutePoints: {
                    some: {
                      inspectionSessionId: session.id,
                    },
                  },
                },
              },
            },
            select: {
              inspectionCycle: true,
              inspectionRoutePoints: {
                select: {
                  completedInspectionRoutePoints: {
                    select: {
                      createdOn: true,
                    },
                  },
                },
              },
            },
          });

          const clientDefaultInspectionCycle =
            session.client.defaultInspectionCycle;

          const shouldExpire = result.some((asset) => {
            const inspectionCycle =
              asset.inspectionCycle ?? clientDefaultInspectionCycle;
            const inspectionDate = asset.inspectionRoutePoints
              .at(0)
              ?.completedInspectionRoutePoints.at(0)?.createdOn;

            return (
              inspectionDate &&
              isBefore(inspectionDate, subDays(new Date(), inspectionCycle))
            );
          });

          if (!shouldExpire) {
            return session;
          }

          await prisma.inspectionSession.update({
            where: { id: session.id },
            data: { status: InspectionSessionStatus.EXPIRED },
          });

          return handleGetSession(session.id);
        });
    });
  }

  async cancelInspectionSession(id: string) {
    return this.prisma.forUser().then((prisma) =>
      prisma.inspectionSession.update({
        where: { id },
        data: { status: InspectionSessionStatus.CANCELLED },
      }),
    );
  }
}
