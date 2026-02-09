import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { endOfMonth, isBefore, min, subDays, subMonths } from 'date-fns';
import { AssetsService } from 'src/assets/assets/assets.service';
import { ApiClsService } from 'src/auth/api-cls.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { CustomQueryFilter } from 'src/auth/keycloak/types';
import { CAPABILITIES } from 'src/auth/utils/capabilities';
import { isScopeAtLeast } from 'src/auth/utils/scope';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import {
  AssetQuestionResponseType,
  AssetQuestionType,
  InspectionStatus,
  Prisma,
  RoleScope,
} from 'src/generated/prisma/client';
import { getAssetsToRenewForDemoClient } from 'src/generated/prisma/sql';
import { PrismaService, PrismaTxClient } from 'src/prisma/prisma.service';
import { AssetQuestionsService } from 'src/products/asset-questions/asset-questions.service';
import { ClearDemoInspectionsQueryDto } from './dto/clear-demo-inspections-query.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { DuplicateDemoClientDto } from './dto/duplicate-demo-client.dto';
import { GenerateDemoInspectionsDto } from './dto/generate-demo-inspections.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const MAX_TX_TIMEOUT_MS_DEMO_INSPECTIONS_GENERATION = 60000;

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ApiClsService,
    private readonly keycloakService: KeycloakService,
    private readonly assetQuestionsService: AssetQuestionsService,
    private readonly assetsService: AssetsService,
  ) {}

  /**
   * Generate realistic responses for asset questions based on their type
   */
  private generateQuestionResponse(
    question: Prisma.AssetQuestionGetPayload<Record<string, never>>,
    context: { assetSerialNumber?: string; isSetup?: boolean },
  ): any {
    switch (question.valueType) {
      case AssetQuestionResponseType.BINARY:
        return Math.random() > 0.1 ? 'Yes' : 'No'; // 90% true
      case AssetQuestionResponseType.INDETERMINATE_BINARY:
        const rand = Math.random();
        return rand < 0.8 ? 'Yes' : rand < 0.95 ? 'No' : 'N/A'; // 80% true, 15% false, 5% N/A
      case AssetQuestionResponseType.TEXT:
        if (context.isSetup) {
          return `Serial: ${context.assetSerialNumber || 'N/A'}`;
        }
        return `Inspected - ${Math.random() > 0.5 ? 'OK' : 'Minor wear noted'}`;
      case AssetQuestionResponseType.TEXTAREA:
        if (context.isSetup) {
          return 'Asset installed and configured according to manufacturer specifications.';
        }
        const comments = [
          'Regular inspection completed. All components functioning properly.',
          'Inspection complete. Equipment in good working order.',
          'Checked all safety features. No issues found.',
          'Routine inspection performed. Asset operating within normal parameters.',
          'Visual inspection completed. No maintenance required at this time.',
        ];
        return comments[Math.floor(Math.random() * comments.length)];
      case AssetQuestionResponseType.NUMBER:
        return Math.floor(Math.random() * 100);
      case AssetQuestionResponseType.DATE:
        return new Date();
      case AssetQuestionResponseType.SELECT:
        if (!Array.isArray(question.selectOptions)) {
          break;
        }
        const values = question.selectOptions
          .filter(
            (o): o is { value: string } =>
              o !== null && typeof o === 'object' && 'value' in o,
          )
          .map((o) => o.value);
        return values[Math.floor(Math.random() * values.length)];
      case AssetQuestionResponseType.IMAGE:
        return 'https://placehold.co/600x400';
      default:
        return 'Yes';
    }
  }

  async create(createClientDto: CreateClientDto) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });

    return prisma.$transaction(async (tx) => {
      // Create the client
      const client = await tx.client.create({ data: createClientDto });

      // Create a default HQ site with the same phone number and address as the client
      await tx.site.create({
        data: {
          name: 'HQ',
          primary: true,
          phoneNumber: createClientDto.phoneNumber,
          address: {
            create: createClientDto.address.create,
          },
          client: {
            connect: {
              id: client.id,
            },
          },
        },
      });

      return client;
    });
  }

  async findAll(queryClientDto: QueryClientDto) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });
    return prisma.client.findManyForPage(
      buildPrismaFindArgs<typeof this.prisma.client>(queryClientDto, {
        include: {
          address: true,
        },
      }),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .build({
        shouldBypassRLSAsSystemAdmin: true,
      })
      .then((prisma) =>
        prisma.client
          .findUniqueOrThrow({
            where: { id },
            include: {
              address: true,
              sites: {
                include: {
                  address: true,
                  _count: { select: { subsites: true, assets: true } },
                },
              },
              _count: {
                select: { sites: true, assets: true },
              },
            },
          })
          .catch(as404OrThrow),
      );
  }

  async findUserOrganization() {
    const prisma = await this.prisma.build();
    const rlsContext = prisma.$rlsContext();
    if (!rlsContext) {
      throw new NotFoundException(
        'Cannot find your organization, because no user information was found.',
      );
    }

    const siteResult = await prisma.site.findUnique({
      where: { id: rlsContext.siteId },
      select: {
        id: true,
        name: true,
        externalId: true,
        address: true,
        phoneNumber: true,
        primary: true,
        client: {
          select: {
            id: true,
            name: true,
            externalId: true,
            address: true,
            phoneNumber: true,
            demoMode: true,
            status: true,
            startedOn: true,
            createdOn: true,
            modifiedOn: true,
          },
        },
      },
    });

    if (!siteResult) {
      throw new NotFoundException('Cannot find details on your organization.');
    }

    const { client, ...site } = siteResult;

    return {
      site,
      client,
    };
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });
    const result = await prisma.$transaction(async (tx) =>
      tx.client
        .update({
          where: { id },
          data: updateClientDto,
        })
        .catch(as404OrThrow),
    );
    // NOTE: We are not invalidating the access grant caches here because wildcard cache
    // deletions are not supported by the memory cache service. The TTL is short enough that
    // stale cache is not a problem.
    return result;
  }

  async remove(id: string) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });
    return prisma.client.delete({ where: { id } }).catch(as404OrThrow);
  }

  async duplicateDemo(id: string, options: DuplicateDemoClientDto) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });
    return prisma.$transaction(async (tx) => {
      const existingClient = await tx.client
        .findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            sites: {
              include: {
                address: true,
              },
            },
            assets: {
              include: {
                tag: true,
              },
            },
          },
        })
        .catch(as404OrThrow);

      if (!existingClient.demoMode) {
        throw new BadRequestException(
          'Client must be in demo mode to perform this action.',
        );
      }

      const {
        status,
        startedOn,
        phoneNumber,
        homeUrl,
        defaultInspectionCycle,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        address: { id: _oldAddressId, ...address },
        sites,
      } = existingClient;

      const duplicateClient = await tx.client.create({
        data: {
          name: options.name,
          status,
          startedOn,
          phoneNumber,
          homeUrl,
          defaultInspectionCycle,
          address: {
            create: address,
          },
          demoMode: true,
        },
        include: {
          sites: true,
        },
      });

      const siteIdsMap = new Map<string, string>();
      await Promise.all(
        sites.map(async (site) => {
          const {
            primary,
            name,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            address: { id: _oldAddressId, ...address },
            phoneNumber,
          } = site;
          const duplicateSite = await tx.site.create({
            data: {
              primary,
              name,
              phoneNumber,
              address: {
                create: address,
              },
              client: {
                connect: {
                  id: duplicateClient.id,
                },
              },
            },
          });
          siteIdsMap.set(site.id, duplicateSite.id);
        }),
      );

      await Promise.all(
        sites.map(async (site) => {
          const duplicateSiteId = siteIdsMap.get(site.id);
          if (!duplicateSiteId || !site.parentSiteId) {
            return;
          }

          const duplicateParentSiteId = siteIdsMap.get(site.parentSiteId);
          if (!duplicateParentSiteId) {
            return;
          }

          await tx.site.update({
            where: { id: duplicateSiteId },
            data: {
              parentSiteId: duplicateParentSiteId,
            },
          });
        }),
      );

      Promise.all(
        existingClient.assets.map(async (asset) => {
          const {
            name,
            active,
            productId,
            location,
            placement,
            serialNumber,
            inspectionCycle,
            tag,
          } = asset;

          const siteId = siteIdsMap.get(asset.siteId);
          if (!siteId) {
            return;
          }

          await tx.asset.create({
            data: {
              name,
              active,
              product: {
                connect: {
                  id: productId,
                },
              },
              location,
              placement,
              serialNumber,
              inspectionCycle,
              site: {
                connect: {
                  id: siteId,
                },
              },
              client: {
                connect: {
                  id: duplicateClient.id,
                },
              },
              tag: tag
                ? {
                    create: {
                      siteId,
                      clientId: duplicateClient.id,
                      serialNumber: tag.serialNumber,
                    },
                  }
                : undefined,
            },
          });
        }),
      );

      // Duplicate members: create new Person records with access to the duplicate client
      const sourceMembers = await tx.person.findMany({
        where: {
          clientAccess: { some: { clientId: existingClient.id } },
        },
        include: {
          clientAccess: { where: { clientId: existingClient.id } },
        },
      });

      for (const member of sourceMembers) {
        const newEmail = member.email.split('@')[0] + '@' + options.emailDomain;

        await tx.person.create({
          data: {
            firstName: member.firstName,
            lastName: member.lastName,
            email: newEmail,
            phoneNumber: member.phoneNumber,
            position: member.position,
            clientAccess: {
              create: member.clientAccess.map((access) => ({
                clientId: duplicateClient.id,
                siteId: siteIdsMap.get(access.siteId) || access.siteId,
                roleId: access.roleId,
                isPrimary: access.isPrimary,
              })),
            },
          },
        });
      }

      return duplicateClient;
    });
  }

  async clearInspectionsForDemoClient(query: ClearDemoInspectionsQueryDto) {
    let uniqueWhere: Prisma.ClientWhereUniqueInput;

    if (query.clientId) {
      uniqueWhere = { id: query.clientId };
    } else {
      const accessGrant = this.cls.requireAccessGrant();
      uniqueWhere = { id: accessGrant.clientId };
    }

    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });

    return prisma.$transaction(async (tx) => {
      const client = await tx.client
        .findUniqueOrThrow({
          where: {
            ...uniqueWhere,
          },
          select: {
            id: true,
            demoMode: true,
          },
        })
        .catch(as404OrThrow);

      if (!client.demoMode) {
        throw new BadRequestException(
          'Client must be in demo mode to perform this action.',
        );
      }

      await tx.inspection.deleteMany({
        where: {
          clientId: client.id,
          createdOn: {
            gte: query.startDate,
            lte: query.endDate ?? undefined,
          },
        },
      });
    });
  }

  async generateInspectionsForDemoClient(options: GenerateDemoInspectionsDto) {
    let uniqueWhere: Prisma.ClientWhereUniqueInput;

    if (options.clientId) {
      uniqueWhere = { id: options.clientId };
    } else {
      const accessGrant = this.cls.requireAccessGrant();
      uniqueWhere = { id: accessGrant.clientId };
    }

    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });

    const client = await prisma.client
      .findUniqueOrThrow({
        where: uniqueWhere,
        include: {
          sites: {
            include: {
              address: true,
              assets: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      })
      .catch(as404OrThrow);

    if (!client.demoMode) {
      throw new BadRequestException(
        'Client must be in demo mode to perform this action.',
      );
    }

    const validInspectors = await this.getValidDemoInspectors(client);
    if (validInspectors.length === 0) {
      throw new BadRequestException(
        'No valid inspectors found for this client.',
      );
    }

    const allAssets = client.sites.flatMap(({ assets, ...site }) =>
      assets.map((a) => ({ ...a, site })),
    );

    if (allAssets.length === 0) {
      throw new BadRequestException('No assets found for this client.');
    }

    const inspectionQuestionCache = new ParentChildIdMap<
      (typeof allAssets)[0],
      Awaited<ReturnType<typeof this.assetQuestionsService.findByAsset>>[number]
    >();

    const assetConfigurationResults = await Promise.all(
      allAssets.map((a) =>
        this.assetQuestionsService
          .checkAssetConfiguration(a)
          .then((r) => ({ ...r, asset: a })),
      ),
    );

    return prisma.$transaction(
      async (tx) => {
        // For assets that need updated configuration, do that now. This affects which
        // questions are presented to the assets. This should only need to be done once,
        // or any time a configuration question changes.
        if (assetConfigurationResults.length > 0) {
          for (const result of assetConfigurationResults) {
            const { asset, isConfigurationMet, checkResults } = result;
            if (!isConfigurationMet) {
              await this.assetsService.handleSetMetadataFromConfigs(
                tx,
                asset,
                checkResults.map((r) => ({
                  assetQuestion: r.assetQuestion,
                  value: this.generateQuestionResponse(r.assetQuestion, {
                    assetSerialNumber: asset.serialNumber,
                    isSetup: true,
                  }),
                })),
              );
            }
          }
        }

        // Ensure all assets are set up with their setup questions answered
        const assetsToSetup = allAssets.filter((asset) => !asset.setupOn);
        for (const asset of assetsToSetup) {
          // Get setup questions for this asset
          const setupQuestions = await this.assetQuestionsService.findByAsset(
            asset,
            AssetQuestionType.SETUP,
          );

          // Generate responses for setup questions
          const setupResponses = setupQuestions.map((question) => {
            const responseValue = this.generateQuestionResponse(question, {
              assetSerialNumber: asset.serialNumber,
              isSetup: true,
            });

            return {
              assetQuestionId: question.id,
              value: responseValue,
              originalPrompt: question.prompt,
              responderId: validInspectors[0]?.id || '',
              siteId: asset.siteId,
              clientId: client.id,
            } satisfies Prisma.AssetQuestionResponseCreateManyAssetInput;
          });

          // Update asset setup date and create responses
          await tx.asset.update({
            where: { id: asset.id },
            data: {
              setupOn: new Date(),
              setupQuestionResponses: { createMany: { data: setupResponses } },
            },
          });
        }

        // Generate inspection data with realistic patterns
        const now = new Date();
        const startDate = subMonths(now, options.monthsBack);

        if (options.resetInspections) {
          await tx.inspection.deleteMany({
            where: {
              clientId: client.id,
              createdOn: {
                gte: startDate.toISOString(),
              },
            },
          });
        }

        const inspectionsCreated: string[] = [];
        for (let i = 1; i <= options.monthsBack; i++) {
          const currentDate = min([
            subMonths(new Date(), options.monthsBack - i),
            new Date(),
          ]);

          let baseComplianceScore = 0.5 + 0.5 * (i / options.monthsBack);

          // Add some turnover dips (simulate company events)
          const monthOfYear = currentDate.getMonth();
          if (monthOfYear === 11 || monthOfYear === 0) {
            // December/January holiday slowdown
            baseComplianceScore *= 0.6;
          } else if (monthOfYear === 6) {
            // July summer vacation
            baseComplianceScore *= 0.8;
          }

          // Calculate how many assets to inspect this month
          const assetsToInspectCount =
            i === options.monthsBack
              ? allAssets.length
              : Math.floor(
                  allAssets.length *
                    baseComplianceScore *
                    (0.8 + Math.random() * 0.4),
                );

          // Randomly select assets for inspection
          const shuffledAssets = [...allAssets].sort(() => Math.random() - 0.5);
          const assetsToInspect = shuffledAssets.slice(0, assetsToInspectCount);

          for (const asset of assetsToInspect) {
            try {
              const inspectionData = await this.generateRandomDemoInspection({
                asset,
                validInspectors,
                currentDate,
                clientId: client.id,
                onCheckAssetCreatedOn: async (inspectionTime) => {
                  if (isBefore(inspectionTime, asset.createdOn)) {
                    const newCreatedOn = subDays(inspectionTime, 1);
                    await tx.asset.update({
                      where: { id: asset.id },
                      data: {
                        createdOn: newCreatedOn,
                      },
                    });
                    asset.createdOn = newCreatedOn;
                  }
                },
                inspectionQuestionCache,
              });

              if (!inspectionData) continue;

              const inspection = await this.createInspection(
                tx,
                inspectionData,
              );

              inspectionsCreated.push(inspection.id);
            } catch (error) {
              // Skip if there's a conflict (e.g., duplicate inspection)
              console.warn(
                `Failed to create inspection for asset ${asset.id}:`,
                error,
              );
            }
          }
        }

        return {
          message: `Generated ${inspectionsCreated.length} demo inspections for client ${client.name}`,
          inspectionsCount: inspectionsCreated.length,
          assetsInvolved: allAssets.length,
          inspectorsUsed: validInspectors.length,
          periodCovered: `${startDate.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`,
          defaultInspectionCycle: client.defaultInspectionCycle,
        };
      },
      { timeout: MAX_TX_TIMEOUT_MS_DEMO_INSPECTIONS_GENERATION },
    );
  }

  async renewNoncompliantDemoAssets(options: { clientId?: string } = {}) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });

    const rlsContext = prisma.$rlsContext();
    const clientId = options.clientId ?? rlsContext?.clientId;

    if (!clientId) {
      throw new BadRequestException('Client ID is required');
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId, demoMode: true },
      include: {
        sites: true,
      },
    });

    if (!client) {
      return;
    }

    const validInspectors = await this.getValidDemoInspectors(client);
    if (validInspectors.length === 0) {
      this.logger.warn(`No valid inspectors found for client ${client.name}`);
    }

    const succeededAssetIds: string[] = [];
    const failedAssetIds: string[] = [];

    const assetsToRenew = await prisma.$queryRawTyped(
      getAssetsToRenewForDemoClient(client.id),
    );

    await prisma.$transaction(
      async (tx) => {
        for (const assetRow of assetsToRenew) {
          // This fixes a typing bug in prisma type generation. The asset properties will not be null,
          // but sometimes prisma thinks they could be.
          const {
            id: assetId,
            siteId: assetSiteId,
            serialNumber: assetSerialNumber,
          } = assetRow;
          if (
            assetId === null ||
            assetSiteId === null ||
            assetSerialNumber === null
          ) {
            continue;
          }

          const inspectionData = await this.generateRandomDemoInspection({
            asset: {
              id: assetId,
              siteId: assetSiteId,
              serialNumber: assetSerialNumber,
            },
            validInspectors,
            clientId: client.id,
          });
          if (!inspectionData) continue;
          try {
            await this.createInspection(tx, inspectionData);
            succeededAssetIds.push(assetId);
          } catch (error) {
            this.logger.error(
              `Failed to create inspection for asset ${assetId}:`,
              error,
            );
            failedAssetIds.push(assetId);
          }
        }
      },
      { timeout: MAX_TX_TIMEOUT_MS_DEMO_INSPECTIONS_GENERATION },
    );

    return {
      succeededAssetIds,
      failedAssetIds,
    };
  }

  private async getValidDemoInspectors(
    client: Prisma.ClientGetPayload<{
      include: {
        sites: true;
      };
    }>,
  ) {
    const prisma = await this.prisma.build({
      shouldBypassRLSAsSystemAdmin: true,
    });
    const currentUser = prisma.$rlsContext();
    const hasMultiSiteScope =
      prisma.$mode === 'cron' ||
      (currentUser && isScopeAtLeast(currentUser.scope, RoleScope.CLIENT));

    const allowedSiteIds = currentUser
      ? currentUser.allowedSiteIdsStr.split(',')
      : [];
    let allowedSiteExternalIds: string[] = [];
    if (!hasMultiSiteScope && allowedSiteIds.length > 0) {
      const allowedSites = await prisma.site.findMany({
        where: {
          id: {
            in: allowedSiteIds,
          },
        },
        select: {
          externalId: true,
        },
      });
      allowedSiteExternalIds = allowedSites.map((s) => s.externalId);
    }

    const queryFilters: CustomQueryFilter[] = [
      {
        q: {
          key: 'client_id',
          op: 'eq',
          value: client.externalId,
        },
      },
    ];

    if (!hasMultiSiteScope) {
      queryFilters.push({
        q: {
          key: 'site_id',
          op: 'in',
          value: allowedSiteExternalIds,
        } as const,
      });
    }

    // Get all Keycloak users for this client to select inspectors from
    const keycloakUsersResponse =
      await this.keycloakService.findUsersByAttribute({
        filter: {
          AND: queryFilters,
        },
        limit: 500,
        offset: 0,
      });

    // Get or create Person records for Keycloak users first (needed for asset setup)
    const keycloakUsers = keycloakUsersResponse.results;
    const { id: inspectorRoleId } = await prisma.role.findFirstOrThrow({
      select: {
        id: true,
      },
      where: {
        isSystem: true,
        scope: RoleScope.SITE,
        capabilities: {
          has: CAPABILITIES.PERFORM_INSPECTIONS,
        },
      },
    });
    const inspectors = await Promise.all(
      keycloakUsers
        .slice(0, Math.min(8, keycloakUsers.length))
        .map(async (kcUser) => {
          const personId = kcUser.id;
          if (!personId) return null;

          let person = await prisma.person.findUnique({
            where: { idpId: personId },
          });

          if (!person) {
            const theirSiteId = client.sites.find(
              (site) => site.externalId === kcUser.attributes?.site_id?.[0],
            )?.id;

            person = await prisma.person.create({
              data: {
                idpId: personId,
                firstName: kcUser.firstName || 'Inspector',
                lastName: kcUser.lastName || 'User',
                email: kcUser.email || `inspector${personId}@example.com`,
                clientAccess: {
                  create: {
                    clientId: client.id,
                    siteId: theirSiteId || '',
                    roleId: inspectorRoleId,
                  },
                },
              },
            });
          }

          return person;
        }),
    );

    return inspectors.filter((i): i is NonNullable<typeof i> => i !== null);
  }

  private async generateRandomDemoInspection(options: {
    asset: Prisma.AssetGetPayload<{
      select: {
        id: true;
        siteId: true;
        serialNumber: true;
      };
    }>;
    validInspectors: Prisma.PersonGetPayload<Record<string, never>>[];
    clientId: string;
    currentDate?: Date;
    onCheckAssetCreatedOn?: (inspectionTime: Date) => Promise<void>;
    inspectionQuestionCache?: ParentChildIdMap<
      typeof options.asset,
      Awaited<ReturnType<AssetQuestionsService['findByAsset']>>[number]
    >;
  }) {
    const {
      asset,
      validInspectors,
      clientId,
      currentDate = new Date(),
      onCheckAssetCreatedOn,
    } = options;

    // Select random inspector
    const inspector =
      validInspectors[Math.floor(Math.random() * validInspectors.length)];
    if (!inspector) return;

    // Generate realistic GPS coordinates around a central location
    const baseLat = 40.7128; // NYC area as default
    const baseLng = -74.006;

    // Generate realistic GPS coordinates (within ~50km radius)
    const latOffset = (Math.random() - 0.5) * 0.5; // ~50km radius
    const lngOffset = (Math.random() - 0.5) * 0.5;

    // Create inspection at random time during the current month and business hours
    const daysInMonth = endOfMonth(currentDate).getDate();
    const randomDay = Math.min(
      daysInMonth,
      1 + Math.floor(Math.random() * daysInMonth),
    );
    const inspectionTime = min([
      new Date(),
      new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        randomDay,
        8 + Math.floor(Math.random() * 10), // 8 AM to 6 PM
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60),
        0,
      ),
    ]);

    // Get inspection questions for this asset if the inspection will be complete
    let inspectionResponses: Array<{
      assetQuestionId: string;
      value: any;
      originalPrompt: string;
      responderId: string;
      siteId: string;
      clientId: string;
    }> = [];

    let inspectionQuestions =
      options.inspectionQuestionCache?.getChildren(asset);

    if (!inspectionQuestions) {
      inspectionQuestions = await this.assetQuestionsService.findByAsset(
        asset,
        AssetQuestionType.INSPECTION,
      );
      options.inspectionQuestionCache?.addChildren(asset, inspectionQuestions);
    }

    inspectionResponses = inspectionQuestions.map((question) => {
      const responseValue = this.generateQuestionResponse(question, {
        assetSerialNumber: asset.serialNumber,
        isSetup: false,
      });

      return {
        assetQuestionId: question.id,
        value: responseValue,
        originalPrompt: question.prompt,
        responderId: inspector.id,
        siteId: asset.siteId,
        clientId,
      };
    });

    if (onCheckAssetCreatedOn) {
      await onCheckAssetCreatedOn(inspectionTime);
    }

    return {
      assetId: asset.id,
      inspectorId: inspector.id,
      status: InspectionStatus.COMPLETE,
      latitude: baseLat + latOffset,
      longitude: baseLng + lngOffset,
      locationAccuracy: 5 + Math.random() * 15, // 5-20m accuracy
      createdOn: inspectionTime,
      modifiedOn: inspectionTime,
      comments: Math.random() > 0.7 ? 'Regular inspection completed' : null,
      siteId: asset.siteId,
      clientId,
      responses: {
        createMany: {
          data: inspectionResponses,
        },
      },
    };
  }

  private async createInspection(
    tx: PrismaTxClient,
    inspectionData:
      | Prisma.InspectionCreateInput
      | Prisma.InspectionUncheckedCreateInput,
  ) {
    const inspection = await tx.inspection.create({
      data: inspectionData,
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
      },
    });

    await this.assetsService.handleAlertTriggers(tx, inspection, {
      skipNotifications: true,
    });
    return inspection;
  }
}

/**
 * Maps parent entities to their child entities by id.
 * Useful for efficiently retrieving children by parent.
 */
class ParentChildIdMap<T extends { id: string }, U extends { id: string }> {
  private readonly parentToChildIds = new Map<string, string[]>();
  private readonly childById = new Map<string, U>();

  constructor() {}

  getChildren(parent: T): U[] | undefined {
    const childIds = this.parentToChildIds.get(parent.id);
    if (childIds) {
      return childIds
        .map((id) => this.childById.get(id))
        .filter(
          (child): child is NonNullable<typeof child> => child !== undefined,
        );
    }
  }

  addChildren(parent: T, children: U[]): void {
    this.parentToChildIds.set(
      parent.id,
      children.map((child) => child.id),
    );
    children.forEach((child) => this.childById.set(child.id, child));
  }
}
