import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { subDays } from 'date-fns';
import { ClsService } from 'nestjs-cls';
import { UsersService } from 'src/clients/users/users.service';
import { testAlertRule } from 'src/common/alert-utils';
import { SendNotificationsBodyDto } from 'src/common/dto/send-notifications-body.dto';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import {
  AssetQuestion,
  AssetQuestionResponse,
  ConsumableQuestionConfig,
  Prisma,
} from 'src/generated/prisma/client';
import { NotificationsService } from 'src/notifications/notifications.service';
import TeamInspectionReminderTemplateReact, {
  TeamInspectionReminderTemplateProps,
  TeamInspectionReminderTemplateSms,
} from 'src/notifications/templates/team-inspection-reminder';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateAssetAlertCriterionRuleSchema,
  CreateSetAssetMetadataConfigSchema,
} from 'src/products/asset-questions/dto/create-asset-question.dto';
import z from 'zod';
import { ConsumablesService } from '../consumables/consumables.service';
import { CreateAssetSchema } from './dto/create-asset.dto';
import { QueryAssetDto } from './dto/query-asset.dto';
import { SetupAssetDto } from './dto/setup-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { UpdateSetupAssetDto } from './dto/update-setup-asset.dto';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consumablesService: ConsumablesService,
    private readonly notifications: NotificationsService,
    private readonly usersService: UsersService,
    private readonly cls: ClsService<CommonClsStore>,
  ) {}

  async create(createAssetDto: Prisma.AssetCreateInput) {
    return this.prisma
      .forContext()
      .then((prisma) => prisma.asset.create({ data: createAssetDto }));
  }

  async findAll(queryAssetDto: QueryAssetDto) {
    return this.prisma.forContext().then(async (prisma) =>
      prisma.asset.findManyForPage(
        buildPrismaFindArgs<typeof prisma.asset>(queryAssetDto, {
          include: {
            product: {
              include: {
                manufacturer: true,
                productCategory: true,
              },
            },
            tag: true,
            alerts: {
              where: { resolved: false },
              select: { id: true, alertLevel: true },
            },
            inspections: {
              take: 1,
              orderBy: { createdOn: 'desc' },
            },
            site: true,
            client: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .forContext()
      .then((prisma) =>
        prisma.asset.findUniqueOrThrow({
          where: { id },
          include: {
            site: true,
            inspectionRoutePoints: {
              include: {
                inspectionRoute: true,
              },
            },
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
            setupQuestionResponses: {
              include: {
                assetQuestion: true,
              },
            },
            consumables: {
              include: {
                product: {
                  include: {
                    ansiCategory: true,
                  },
                },
              },
            },
            alerts: true,
            tag: true,
            productRequests: {
              where: {
                createdOn: {
                  gte: subDays(new Date(), 30),
                },
              },
              include: {
                productRequestItems: {
                  include: {
                    product: true,
                  },
                },
                productRequestApprovals: {
                  include: {
                    approver: true,
                  },
                },
              },
            },
            client: true,
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findManyWithLatestInspection(queryAssetDto: QueryAssetDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.asset.findManyForPage(
        buildPrismaFindArgs<typeof prisma.asset>(queryAssetDto, {
          include: {
            inspections: { orderBy: { createdOn: 'desc' }, take: 1 },
            client: true,
            product: true,
          },
        }),
      ),
    );
  }

  async addTag(id: string, tagExternalId: string, tagSerialNumber: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.asset.update({
          where: { id },
          data: {
            tag: {
              connectOrCreate: {
                where: { externalId: tagExternalId },
                create: { serialNumber: tagSerialNumber },
              },
            },
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findOneAlert(id: string, alertId: string) {
    return this.prisma
      .forUser()
      .then((prisma) =>
        prisma.alert.findUniqueOrThrow({
          where: {
            id: alertId,
            assetId: id,
          },
          include: {
            asset: {
              include: {
                product: true,
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

  async update(id: string, updateAssetDto: UpdateAssetDto) {
    return this.prisma.forContext().then((prisma) =>
      prisma.asset
        .update({
          where: { id },
          data: updateAssetDto,
        })
        .catch(as404OrThrow),
    );
  }

  async setup(id: string, setupAssetDto: SetupAssetDto) {
    const prismaClient = await this.prisma.forUser();

    const updatedAsset = await prismaClient.asset
      .update({
        where: { id, setupOn: null },
        data: {
          ...setupAssetDto,
          setupOn: new Date(),
        },
        include: {
          setupQuestionResponses: {
            include: {
              assetQuestion: {
                include: {
                  consumableConfig: true,
                  setAssetMetadataConfig: true,
                },
              },
            },
          },
        },
      })
      .then(async (asset) => {
        await this.handleUpdateMetadataFromSetupResponses(prismaClient, asset);
        await this.handleConsumableConfigs(prismaClient, asset);
        await this.handleSetMetdataFromConfigs(
          prismaClient,
          asset,
          asset.setupQuestionResponses,
        );
        return asset;
      })
      .catch(as404OrThrow);

    return updatedAsset;
  }

  async updateSetup(id: string, updateSetupAssetDto: UpdateSetupAssetDto) {
    return this.prisma.forUser().then((prisma) =>
      prisma.asset
        .update({
          where: { id, setupOn: { not: null } },
          data: updateSetupAssetDto,
        })
        .catch(as404OrThrow),
    );
  }

  async getMetadataKeys() {
    const prisma = await this.prisma.forContext();

    const conditionMetadataKeysPromise = prisma.$queryRaw<
      Array<{ key: string }>
    >`
    SELECT DISTINCT split_part(jsonb_array_elements_text("value"), ':', 1) as key
    FROM "AssetQuestionCondition"
    WHERE "value" IS NOT NULL
      AND "conditionType" = 'METADATA'
    ORDER BY key
  `.then((r) => r.map((r) => r.key));

    const setAssetMetadataKeysPromise = prisma.$queryRaw<
      Array<{ key: string }>
    >`
    SELECT DISTINCT elem->>'key' as key
    FROM "SetAssetMetadataConfig",
        jsonb_array_elements(metadata) as elem
    WHERE elem->>'key' IS NOT NULL
      AND elem->>'key' != '';
  `.then((r) => r.map((r) => r.key));

    const assetMetadataKeysPromise = prisma.$queryRaw<Array<{ key: string }>>`
    SELECT DISTINCT jsonb_object_keys("metadata") as key
    FROM "Asset"
    WHERE "metadata" IS NOT NULL
    ORDER BY key
  `.then((r) => r.map((r) => r.key));

    const [conditionMetadataKeys, setAssetMetadataKeys, assetMetadataKeys] =
      await Promise.all([
        conditionMetadataKeysPromise,
        setAssetMetadataKeysPromise,
        assetMetadataKeysPromise,
      ]);

    return [
      ...new Set([
        ...conditionMetadataKeys,
        ...setAssetMetadataKeys,
        ...assetMetadataKeys,
      ]),
    ];
  }

  async handleAlertTriggers(
    inspection: Prisma.InspectionGetPayload<{
      include: {
        responses: {
          include: {
            assetQuestion: {
              include: {
                assetAlertCriteria: true;
              };
            };
          };
        };
      };
    }>,
    {
      tx,
      skipNotifications = false,
    }: {
      tx?: Parameters<
        Parameters<
          Awaited<ReturnType<PrismaService['build']>>['$transaction']
        >[0]
      >[0];
      skipNotifications?: boolean;
    } = {},
  ) {
    if (!inspection || inspection.status !== 'COMPLETE') {
      return;
    }

    const createInputs = inspection.responses.flatMap((response) =>
      response.assetQuestion.assetAlertCriteria
        .map((alertCriteria) => {
          const {
            success,
            data: rule,
            error,
          } = CreateAssetAlertCriterionRuleSchema.safeParse(alertCriteria.rule);

          if (!success || !rule || error) {
            this.logger.warn('Invalid alert rule', error);
            return {
              alertCriteria,
              result: false,
            };
          }

          return {
            alertCriteria,
            result: testAlertRule(
              response.value,
              response.assetQuestion.valueType,
              rule,
            ),
          };
        })
        .filter(
          (r): r is typeof r & { result: string } =>
            typeof r.result === 'string',
        )
        .map(
          ({ alertCriteria: alertCriterion, result: message }) =>
            ({
              createdOn: inspection.createdOn,
              modifiedOn: inspection.modifiedOn,
              alertLevel: alertCriterion.alertLevel,
              message,
              resolved: alertCriterion.autoResolve,
              resolvedOn: alertCriterion.autoResolve ? new Date() : undefined,
              resolutionNote: alertCriterion.autoResolve
                ? 'Auto-resolved by system.'
                : undefined,
              assetId: inspection.assetId,
              inspectionId: inspection.id,
              assetQuestionResponseId: response.id,
              assetAlertCriterionId: alertCriterion.id,
              siteId: inspection.siteId,
              clientId: inspection.clientId,
            }) satisfies Prisma.AlertCreateManyInput,
        ),
    );

    const results = await (
      tx ?? (this.prisma.bypassRLS() as NonNullable<typeof tx>)
    ).alert.createManyAndReturn({
      data: createInputs,
      select: {
        id: true,
      },
    });

    if (!skipNotifications) {
      for (const result of results) {
        this.notifications.queueInspectionAlertTriggeredEmail(result.id);
      }
    }
  }

  async handleUpdateMetadataFromSetupResponses(
    prismaClient: Awaited<ReturnType<PrismaService['forUser']>>,
    asset: Prisma.AssetGetPayload<{
      include: {
        metadata: true;
        setupQuestionResponses: {
          include: {
            assetQuestion: {
              include: {
                setAssetMetadataConfig: true;
              };
            };
          };
        };
      };
    }>,
  ) {
    const mergedMetadata = {
      ...(asset.metadata as Record<string, string>),
      ...asset.setupQuestionResponses.reduce((acc, response) => {
        if (response.assetQuestion.setAssetMetadataConfig) {
          return {
            ...acc,
            ...(response.assetQuestion.setAssetMetadataConfig
              .metadata as Record<string, string>),
          };
        }
        return acc;
      }, {}),
    };

    return await prismaClient.asset.update({
      where: { id: asset.id },
      data: { metadata: mergedMetadata },
    });
  }

  async handleConsumableConfigs(
    prismaClient: Awaited<ReturnType<PrismaService['forUser']>>,
    asset: Prisma.AssetGetPayload<{
      include: {
        setupQuestionResponses: {
          include: {
            assetQuestion: {
              include: {
                consumableConfig: true;
              };
            };
          };
        };
      };
    }>,
  ) {
    // Handle consumable configs from setup responses
    await Promise.all(
      asset.setupQuestionResponses
        .filter(
          (
            response,
          ): response is AssetQuestionResponse & {
            assetQuestion: AssetQuestion & {
              consumableConfig: ConsumableQuestionConfig;
            };
          } => !!response.assetQuestion.consumableConfig,
        )
        .map((response) =>
          this.consumablesService.handleConsumableConfig(
            prismaClient,
            response,
            asset.id,
          ),
        ),
    );
  }

  async handleSetMetdataFromConfigs(
    prismaClient: Awaited<ReturnType<PrismaService['forUser']>>,
    asset: Prisma.AssetGetPayload<{}>,
    responses: Prisma.AssetQuestionResponseGetPayload<{
      include: {
        assetQuestion: {
          include: {
            setAssetMetadataConfig: true;
          };
        };
      };
    }>[],
  ) {
    const existingMetadata =
      CreateAssetSchema.shape.metadata.safeParse(asset.metadata).data ?? {};

    const newMetadata = Object.fromEntries(
      responses
        .filter(
          (
            response,
          ): response is typeof response & {
            assetQuestion: Exclude<
              typeof response.assetQuestion,
              'metadata'
            > & {
              setAssetMetadataConfig: z.infer<
                typeof CreateSetAssetMetadataConfigSchema
              >;
            };
          } =>
            response.assetQuestion.setAssetMetadataConfig !== null &&
            CreateSetAssetMetadataConfigSchema.safeParse(
              response.assetQuestion.setAssetMetadataConfig,
            ).success,
        )
        .flatMap((response) => {
          const metadataConfigs =
            response.assetQuestion.setAssetMetadataConfig.metadata;
          return metadataConfigs.map((config) => {
            return [
              config.key,
              config.type === 'STATIC' ? config.value : response.value,
            ];
          });
        }),
    );

    const mergedMetadata = {
      ...existingMetadata,
      ...newMetadata,
    };

    await prismaClient.asset.update({
      where: { id: asset.id },
      data: { metadata: mergedMetadata },
    });
  }

  async remove(id: string) {
    return this.prisma
      .forContext()
      .then((prisma) => prisma.asset.delete({ where: { id } }));
  }

  async sendReminderNotifications(id: string, body: SendNotificationsBodyDto) {
    const user = this.cls.get('user');

    if (!user) {
      throw new UnauthorizedException();
    }

    const users = await this.usersService.findAll({
      id: body.userIds,
      limit: 10000,
      offset: 0,
    });

    const asset = await this.findOne(id);
    const templateProps: Omit<
      TeamInspectionReminderTemplateProps,
      'firstName'
    > = {
      asset,
      requestorName: `${user.givenName} ${user.familyName}`,
    };

    await this.notifications.sendEmails(
      users.results.map((user) => ({
        react: TeamInspectionReminderTemplateReact({
          ...templateProps,
          firstName: user.firstName,
        }),
        to: [user.email],
        subject: 'Team Inspection Reminder',
      })),
    );

    await Promise.allSettled(
      users.results
        .filter(
          (user): user is typeof user & { phoneNumber: string } =>
            !!user.phoneNumber,
        )
        .map(async (user) => {
          const phoneNumber = formatPhoneNumber(user.phoneNumber);
          return this.notifications
            .sendSms({
              to: phoneNumber,
              text: TeamInspectionReminderTemplateSms({
                ...templateProps,
                firstName: user.firstName,
              }),
            })
            .catch((e) => {
              this.logger.error(
                `Failed to send SMS to ${phoneNumber}: ${e.message}`,
              );
            });
        }),
    );
  }
}

function formatPhoneNumber(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/[^\d\+]/g, '');

  if (cleaned.startsWith('+') || cleaned.length !== 10) {
    return phoneNumber;
  }

  return `+1${cleaned}`;
}
