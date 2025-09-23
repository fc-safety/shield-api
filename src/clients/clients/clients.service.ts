import { BadRequestException, Injectable } from '@nestjs/common';
import { endOfMonth, isBefore, min, subDays, subMonths } from 'date-fns';
import { ClsService } from 'nestjs-cls';
import pRetry from 'p-retry';
import { RolesService } from 'src/admin/roles/roles.service';
import { AssetsService } from 'src/assets/assets/assets.service';
import { KeycloakService } from 'src/auth/keycloak/keycloak.service';
import { CommonClsStore } from 'src/common/types';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import {
  AssetQuestionResponseType,
  AssetQuestionType,
  InspectionStatus,
  Prisma,
} from 'src/generated/prisma/client';
import { getAssetsToRenewForDemoClient } from 'src/generated/prisma/client/sql';
import { PrismaService, PrismaTxClient } from 'src/prisma/prisma.service';
import { AssetQuestionsService } from 'src/products/asset-questions/asset-questions.service';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';
import { UsersService } from '../users/users.service';
import { ClearDemoInspectionsQueryDto } from './dto/clear-demo-inspections-query.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { DuplicateDemoClientDto } from './dto/duplicate-demo-client.dto';
import { GenerateDemoInspectionsDto } from './dto/generate-demo-inspections.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

const MAX_TX_TIMEOUT_MS_DEMO_INSPECTIONS_GENERATION = 60000;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly cls: ClsService<CommonClsStore>,
    private readonly keycloakService: KeycloakService,
    private readonly assetQuestionsService: AssetQuestionsService,
    private readonly assetsService: AssetsService,
  ) {}

  /**
   * Generate realistic responses for asset questions based on their type
   */
  private generateQuestionResponse(
    question: any,
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
      default:
        return 'Yes';
    }
  }

  async create(createClientDto: CreateClientDto) {
    return this.prisma
      .build()
      .then((prisma) => prisma.client.create({ data: createClientDto }));
  }

  async findAll(queryClientDto: QueryClientDto) {
    const prisma = await this.prisma.build();
    return prisma.client.findManyForPage(
      buildPrismaFindArgs<typeof this.prisma.client>(queryClientDto, {
        include: {
          address: true,
          _count: {
            select: { sites: true },
          },
        },
      }),
    );
  }

  async findOne(id: string) {
    return this.prisma.build().then((prisma) =>
      prisma.client
        .findUniqueOrThrow({
          where: { id },
          include: {
            address: true,
            sites: {
              include: {
                address: true,
                _count: { select: { subsites: true } },
              },
            },
          },
        })
        .catch(as404OrThrow),
    );
  }

  async update(id: string, updateClientDto: UpdateClientDto) {
    const prisma = await this.prisma.build();
    return prisma.$transaction(async (tx) =>
      tx.client
        .update({
          where: { id },
          data: updateClientDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    const prisma = await this.prisma.build();
    return prisma.$transaction(async (tx) => {
      const client = await tx.client.findUniqueOrThrow({
        where: { id },
        include: { sites: true },
      });
      const result = await tx.client.delete({ where: { id } });

      const users = await this.usersService
        .findAll(
          QueryUserDto.create({
            limit: 5000,
          }),
          client,
        )
        .then((users) => users.results);

      await Promise.all(
        users.map((user) => this.usersService.remove(user.id, client)),
      );

      return result;
    });
  }

  async duplicateDemo(id: string, options: DuplicateDemoClientDto) {
    const prisma = await this.prisma.build();
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
      const siteExternalIdsMap = new Map<string, string>();
      await Promise.all(
        sites.map(async (site) => {
          const {
            primary,
            name,
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
          siteExternalIdsMap.set(site.externalId, duplicateSite.externalId);
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

      const query = QueryUserDto.create({
        limit: 1000,
      });
      const users = await this.usersService
        .findAll(query, existingClient)
        .then((users) => users.results);
      const roles = await this.rolesService.getRoles();
      const roleNameMap = new Map<string, string>(
        roles.map((role) => [role.name, role.id]),
      );

      const newUserIds: string[] = [];

      try {
        await Promise.all(
          users.map(async (user) => {
            const newEmail =
              user.email.split('@')[0] + '@' + options.emailDomain;

            const newUser = await this.usersService.create(
              CreateUserDto.create({
                email: newEmail,
                firstName: user.firstName,
                lastName: user.lastName,
                siteExternalId: siteExternalIdsMap.get(user.siteExternalId),
                phoneNumber: user.phoneNumber,
                position: user.position,
                password: options.password,
              }),
              duplicateClient,
            );
            newUserIds.push(newUser.id);

            if (!user.roleName) {
              return;
            }

            const roleId = roleNameMap.get(user.roleName);
            if (!roleId) {
              return;
            }

            await this.usersService.assignRole(
              newUser.id,
              AssignRoleDto.create({ roleId }),
              duplicateClient,
            );
          }),
        );
      } catch (e) {
        await Promise.all(
          newUserIds.map((userId) =>
            pRetry(() => this.usersService.remove(userId, duplicateClient), {
              retries: 3,
            }),
          ),
        );

        throw e;
      }

      return duplicateClient;
    });
  }

  async clearInspectionsForDemoClient(query: ClearDemoInspectionsQueryDto) {
    let uniqueWhere: Prisma.ClientWhereUniqueInput;

    if (query.clientId) {
      uniqueWhere = { id: query.clientId };
    } else {
      const user = this.cls.get('user');
      if (!user) {
        throw new BadRequestException('User not found');
      }
      uniqueWhere = { externalId: user.clientId };
    }

    const prisma = await this.prisma.build();

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
      const user = this.cls.get('user');
      if (!user) {
        throw new BadRequestException('User not found');
      }
      uniqueWhere = { externalId: user.clientId };
    }

    const prisma = await this.prisma.build();

    return prisma.$transaction(
      async (tx) => {
        const client = await tx.client
          .findUniqueOrThrow({
            where: uniqueWhere,
            include: {
              sites: {
                include: {
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

        const allAssets = client.sites.flatMap((site) => site.assets);

        if (allAssets.length === 0) {
          throw new BadRequestException('No assets found for this client.');
        }

        // Ensure all assets are set up with their setup questions answered
        const assetsToSetup = allAssets.filter((asset) => !asset.setupOn);
        for (const asset of assetsToSetup) {
          // Get setup questions for this asset
          const setupQuestions = await this.assetQuestionsService.findByAsset(
            asset.id,
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

  async renewNoncompliantDemoAssets(options: { clientId: string }) {
    const prisma = await this.prisma.build();

    const client = await prisma.client.findUnique({
      where: { id: options.clientId, demoMode: true },
      include: {
        sites: true,
      },
    });

    if (!client) {
      return;
    }

    const validInspectors = await this.getValidDemoInspectors(client);

    const succeededAssetIds: string[] = [];
    const failedAssetIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      const assetsToRenew = await tx.$queryRawTyped(
        getAssetsToRenewForDemoClient(options.clientId),
      );

      for (const asset of assetsToRenew) {
        const inspectionData = await this.generateRandomDemoInspection({
          asset,
          validInspectors,
          clientId: client.id,
        });
        if (!inspectionData) continue;
        try {
          await this.createInspection(tx, inspectionData);
          succeededAssetIds.push(asset.id);
        } catch (error) {
          failedAssetIds.push(asset.id);
        }
      }
    });

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
    const prisma = await this.prisma.build();

    // Get all Keycloak users for this client to select inspectors from
    const keycloakUsersResponse =
      await this.keycloakService.findUsersByAttribute({
        filter: {
          q: {
            key: 'client_id',
            op: 'eq',
            value: client.externalId,
          },
        },
        limit: 500,
        offset: 0,
      });

    // Get or create Person records for Keycloak users first (needed for asset setup)
    const keycloakUsers = keycloakUsersResponse.results;
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
                siteId: theirSiteId || '',
                clientId: client.id,
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
    validInspectors: Prisma.PersonGetPayload<{}>[];
    clientId: string;
    currentDate?: Date;
    onCheckAssetCreatedOn?: (inspectionTime: Date) => Promise<void>;
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

    const inspectionQuestions = await this.assetQuestionsService.findByAsset(
      asset.id,
      AssetQuestionType.INSPECTION,
    );

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
