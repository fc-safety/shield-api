import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import {
  addDays,
  addMilliseconds,
  differenceInDays,
  isBefore,
  isToday,
} from 'date-fns';
import React from 'react';
import { Role } from 'src/admin/roles/model/role';
import {
  RoleScope,
  scopeAllowsAllClientSites,
  scopeAllowsMultipleClients,
  TScope,
} from 'src/auth/scope';
import { ClientUser } from 'src/clients/users/model/client-user';
import { UsersService } from 'src/clients/users/users.service';
import { groupBy } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CLIENT_NOTIFICATIONS_JOB_NAMES,
  NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '../lib/constants';
import { SendEmailJobData } from '../lib/templates';
import {
  ClientNotificationJobData,
  SendInspectionAlertTriggeredEmailJobData,
} from '../lib/types';
import {
  INotificationGroup,
  isInspectionReminderNotificationGroup,
  NotificationGroupId,
  NotificationGroups,
} from '../notification-types';
import InspectionDueSoonAlertLevel1TemplateReact from '../templates/inspection_due_soon_alert_level_1';
import InspectionDueSoonAlertLevel2TemplateReact from '../templates/inspection_due_soon_alert_level_2';
import InspectionDueSoonAlertLevel3TemplateReact from '../templates/inspection_due_soon_alert_level_3';
import InspectionDueSoonAlertLevel4TemplateReact from '../templates/inspection_due_soon_alert_level_4';
import InspectionReminderTemplateReact from '../templates/inspection_reminder';
import MonthlyConsumableReportTemplateReact from '../templates/monthly_consumables_report';
import MonthlyInspectionReportTemplateReact from '../templates/monthly_inspection_report';

@Processor(QUEUE_NAMES.CLIENT_NOTIFICATIONS, {
  prefix: QUEUE_PREFIX,
  removeOnComplete: {
    age: 3600, // keep up to 1 hour
    count: 1000, // keep up to 1000 jobs
  },
  removeOnFail: {
    age: 24 * 3600 * 7, // keep up to 7 days
  },
})
export class ClientNotificationsProcessor
  extends WorkerHost
  implements OnApplicationShutdown
{
  private readonly logger = new Logger(ClientNotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    @InjectQueue(QUEUE_NAMES.CLIENT_NOTIFICATIONS)
    private readonly clientNotificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SEND_NOTIFICATIONS)
    private readonly notificationsQueue: Queue,
    private readonly config: ApiConfigService,
  ) {
    super();
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Received shutdown signal: ${signal}. Closing ${ClientNotificationsProcessor.name}...`,
    );
    await this.worker.close().catch((e) => this.logger.warn(e));
    await this.clientNotificationsQueue
      .close()
      .catch((e) => this.logger.warn(e));
  }

  @OnWorkerEvent('error')
  onFailed(job: Job<unknown>, error: Error) {
    this.logger.error('Processor failed', { job, error });
  }

  @OnWorkerEvent('ready')
  onReady() {
    this.logger.debug('Processor ready');
  }

  @OnWorkerEvent('active')
  onActive(job: Job<unknown>) {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}...`);
  }

  async process(job: Job<unknown>): Promise<any> {
    switch (job.name) {
      case CLIENT_NOTIFICATIONS_JOB_NAMES.PROCESS_CLIENT_INSPECTION_REMINDERS:
        return await this.processClientInspectionReminders(
          job as Job<ClientNotificationJobData>,
        );
      case CLIENT_NOTIFICATIONS_JOB_NAMES.PROCESS_CLIENT_MONTHLY_INSPECTION_REPORTS:
        return await this.processClientMonthlyInspectionReports(
          job as Job<ClientNotificationJobData>,
        );
      case NOTIFICATIONS_JOB_NAMES.SEND_INSPECTION_ALERT_TRIGGERED_EMAIL:
        return await this.sendInspectionAlertTriggeredEmail(
          job as Job<SendInspectionAlertTriggeredEmailJobData>,
        );

      default:
        this.logger.warn('--> Unknown job name', { jobName: job.name });
        return {};
    }
  }

  // Job handlers

  /**
   * Processes client inspection reminders.
   *
   * @param job The job to process.
   * @returns The result of the job.
   */
  private async processClientInspectionReminders(
    job: Job<ClientNotificationJobData>,
  ): Promise<any> {
    const client = await this.prisma.bypassRLS().client.findUniqueOrThrow({
      where: { id: job.data.clientId },
    });

    if (client.demoMode) {
      this.logger.debug(
        `--> Skipping inspection reminders for demo client ${job.data.clientId}...`,
      );
      return {};
    }

    // All users for the client.
    const clientUsers = await this.getClientUsers(job.data.clientId);

    // This mapping indicates which users should receive which reminder notification types.
    const usersByNotificationGroupId = getUsersGroupedByNotificationGroupId(
      clientUsers,
      INSPECTION_REMINDER_NOTIFICATION_GROUPS,
    );

    // These mappings indicate which user roles should have visibility into which client assets.
    const assetScopeMappings = await this.getAssetScopeMappings(
      job.data.clientId,
    );

    /**
     * A mapping of notification group ID to a list of assets that should receive notifications for that group.
     */
    const inspectionReminderBuckets: Map<
      NotificationGroupId,
      Prisma.AssetGetPayload<{
        include: {
          site: true;
          inspections: true;
          product: {
            include: {
              productCategory: true;
            };
          };
        };
      }>[]
    > = new Map(INSPECTION_REMINDER_NOTIFICATION_GROUPS.map((g) => [g.id, []]));

    // Get all assets for the client with their latest inspection.
    const assets = await this.prisma.bypassRLS().asset.findMany({
      where: { clientId: job.data.clientId },
      include: {
        site: true,
        inspections: { orderBy: { createdOn: 'desc' }, take: 1 },
        product: { include: { productCategory: true } },
      },
    });

    // Group assets into buckets if they meet any of the notification group thresholds.
    for (const asset of assets) {
      // Consider the asset creation date as the last inspected date if there are no inspections.
      const lastInspectedOn =
        asset.inspections.at(0)?.createdOn ?? asset.createdOn;
      const inspectionCycle =
        asset.inspectionCycle ?? client.defaultInspectionCycle;

      for (const group of INSPECTION_REMINDER_NOTIFICATION_GROUPS_THRESHOLD_ASC) {
        if (
          isThresholdMetToday({
            inspectionCycle,
            lastInspectedOn,
            thresholdConfig: group.config,
          })
        ) {
          if (!inspectionReminderBuckets.has(group.id)) {
            inspectionReminderBuckets.set(group.id, []);
          }
          inspectionReminderBuckets.get(group.id)?.push(asset);
          break;
        }
      }
    }

    // For each bucket, send notifications to the users that should receive them.
    for (const [
      notificationGroupId,
      assets,
    ] of inspectionReminderBuckets.entries()) {
      const users = usersByNotificationGroupId.get(notificationGroupId);

      if (assets.length === 0) {
        continue;
      }

      if (!users || users.length === 0) {
        this.logger.debug(
          `--> Skipping notification group "${notificationGroupId}" because there are no users to send to.`,
        );
        continue;
      }

      for (const user of users) {
        const visibleAssetIds = getVisibleAssetIdsForUser(
          user,
          assetScopeMappings,
        );
        const visibleAssets = assets.filter((a) =>
          visibleAssetIds.includes(a.id),
        );

        // If user has no visibility into these assets, skip.
        if (visibleAssets.length === 0) {
          continue;
        }

        // Group assets to be displayed by site ID.
        const assetsBySite = groupBy(visibleAssets, (a) => a.site.id);

        // Prepare presentation properties to be passed to the template.
        const props: SharedInspectionReminderTemplateProps = {
          recipientFirstName: user.firstName,
          singleSite: isSingleSiteUser(user),
          frontendUrl: this.config.get('FRONTEND_URL'),
          assetsDueForInspectionBySite: Object.entries(assetsBySite).map(
            ([, assets]) => ({
              siteId: assets.at(0)?.site.id ?? 'unknown',
              siteName: assets.at(0)?.site.name ?? 'Unknown',
              assetsDueForInspection: assets.map((a) => ({
                assetId: a.id,
                assetName: a.name,
                categoryId: a.product.productCategory.id,
                categoryName: a.product.productCategory.name,
                categoryIcon: a.product.productCategory.icon,
                categoryColor: a.product.productCategory.color,
                product: a.product.name,
                dueDate: addDays(
                  a.inspections.at(0)?.createdOn ?? a.createdOn,
                  a.inspectionCycle ?? client.defaultInspectionCycle,
                ),
              })),
            }),
          ),
        };

        await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, {
          templateName: notificationGroupId,
          to: [user.email],
          templateProps: props,
        } satisfies SendEmailJobData<typeof notificationGroupId>);
      }
    }

    return {};
  }

  private async processClientMonthlyInspectionReports(
    job: Job<ClientNotificationJobData>,
  ): Promise<any> {
    this.logger.debug(
      `--> Processing client monthly inspection reports for client ${job.data.clientId}...`,
    );

    const client = await this.prisma.bypassRLS().client.findUniqueOrThrow({
      where: { id: job.data.clientId },
    });

    if (client.demoMode) {
      this.logger.debug(
        `--> Skipping monthly inspection reports for demo client ${job.data.clientId}...`,
      );
      return {};
    }

    // All users for the client.
    const clientUsers = await this.getClientUsers(job.data.clientId);

    // This mapping indicates which users should receive which reminder notification types.
    const usersByNotificationGroupId = getUsersGroupedByNotificationGroupId(
      clientUsers,
      Object.values(NotificationGroups).filter((g) =>
        (
          [
            'monthly_compliance_report',
            'monthly_consumables_report',
          ] satisfies NotificationGroupId[] as string[]
        ).includes(g.id),
      ),
    );

    // These mappings indicate which user roles should have visibility into which client assets.
    const assetScopeMappings = await this.getAssetScopeMappings(
      job.data.clientId,
    );

    // Build and send monthly inspection reports.
    const monthlyComplianceReportUsers = usersByNotificationGroupId.get(
      'monthly_compliance_report',
    );
    if (
      monthlyComplianceReportUsers &&
      monthlyComplianceReportUsers.length > 0
    ) {
      // Get all assets for the client with their latest inspection.
      const assets = await this.prisma.bypassRLS().asset.findMany({
        where: { clientId: job.data.clientId },
        include: {
          site: true,
          inspections: { orderBy: { createdOn: 'desc' }, take: 1 },
          product: { include: { productCategory: true } },
          _count: {
            select: {
              alerts: {
                where: {
                  resolved: false,
                },
              },
            },
          },
        },
      });

      // For each user, determine visible assets and then build and send the report.
      for (const user of monthlyComplianceReportUsers) {
        const visibleAssetIds = getVisibleAssetIdsForUser(
          user,
          assetScopeMappings,
        );
        const visibleAssets = assets.filter((a) =>
          visibleAssetIds.includes(a.id),
        );

        if (visibleAssets.length === 0) {
          continue;
        }

        // Group assets to be displayed by site ID.
        const assetsBySite = groupBy(visibleAssets, (a) => a.site.id);

        const props = {
          recipientFirstName: user.firstName,
          clientName: client.name,
          singleSite: isSingleSiteUser(user),
          frontendUrl: this.config.get('FRONTEND_URL'),
          reportRowsBySite: Object.entries(assetsBySite).map(
            ([, siteAssets]) => {
              const assetsByCategory = groupBy(
                siteAssets,
                (a) => a.product.productCategory.id,
              );

              return {
                siteName: siteAssets.at(0)?.site.name ?? 'Unknown',
                siteId: siteAssets.at(0)?.site.id ?? 'unknown',
                reportRows: Object.entries(assetsByCategory).map(
                  ([, categoryAssets]) => {
                    // Calculate total alerts for category.
                    const totalAlerts = categoryAssets.reduce(
                      (acc, a) => acc + a._count.alerts,
                      0,
                    );

                    // Calculate total compliant assets for category.
                    const totalCompliant = categoryAssets.filter((a) => {
                      const lastInspectedOn =
                        a.inspections.at(0)?.createdOn ?? a.createdOn;
                      const inspectionCycle =
                        a.inspectionCycle ?? client.defaultInspectionCycle;
                      return isBefore(
                        new Date(),
                        addDays(lastInspectedOn, inspectionCycle),
                      );
                    }).length;

                    const productCategory =
                      categoryAssets.at(0)?.product.productCategory;

                    return {
                      categoryId: productCategory?.id ?? 'unknown',
                      categoryName:
                        productCategory?.shortName ??
                        productCategory?.name ??
                        'Unknown',
                      categoryIcon: productCategory?.icon ?? undefined,
                      categoryColor: productCategory?.color ?? undefined,
                      assetCount: categoryAssets.length,
                      pctCompliant: totalCompliant / categoryAssets.length,
                      unresolvedAlertsCount: totalAlerts,
                    };
                  },
                ),
              };
            },
          ),
        } satisfies React.ComponentProps<
          typeof MonthlyInspectionReportTemplateReact
        >;

        await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, {
          templateName: 'monthly_compliance_report',
          to: [user.email],
          templateProps: props,
        } satisfies SendEmailJobData<'monthly_compliance_report'>);
      }
    }

    // Build and send asset compliance reports.
    const monthlyConsumableReportUsers = usersByNotificationGroupId.get(
      'monthly_consumables_report',
    );
    if (
      monthlyConsumableReportUsers &&
      monthlyConsumableReportUsers.length > 0
    ) {
      const consumables = await this.prisma
        .bypassRLS()
        .consumable.findMany({
          where: {
            clientId: job.data.clientId,
            expiresOn: {
              not: null,
              lte: addDays(new Date(), 90),
            },
          },
          include: {
            asset: true,
            product: {
              include: {
                productCategory: true,
              },
            },
            site: true,
          },
        })
        .then((consumables) =>
          // Ensure that all consumables have an expiration date.
          consumables.filter(
            (
              c,
            ): c is typeof c & {
              expiresOn: NonNullable<(typeof c)['expiresOn']>;
            } => c.expiresOn !== null,
          ),
        );

      for (const user of monthlyConsumableReportUsers) {
        const visibleAssetIds = getVisibleAssetIdsForUser(
          user,
          assetScopeMappings,
        );
        const visibleConsumables = consumables.filter(
          (c) => c.assetId && visibleAssetIds.includes(c.assetId),
        );

        if (visibleConsumables.length === 0) {
          continue;
        }

        const consumablesByExpiration = groupBy(visibleConsumables, (c) => {
          const daysUntilExpiration = differenceInDays(c.expiresOn, new Date());
          if (daysUntilExpiration <= 30) {
            return '30-days';
          } else if (daysUntilExpiration <= 60) {
            return '60-days';
          } else {
            return '90-days';
          }
        });

        const mapToConsumableItem = (
          consumable: (typeof consumables)[number],
        ) => ({
          siteName: consumable.site.name,
          item: consumable.product.name,
          assetName: consumable.asset?.name ?? 'Unknown',
          category:
            consumable.product.productCategory.shortName ??
            consumable.product.productCategory.name,
          categoryColor: consumable.product.productCategory.color,
          categoryIcon: consumable.product.productCategory.icon,
          expiryDate: consumable.expiresOn.toISOString(),
        });

        const props = {
          recipientFirstName: user.firstName,
          clientName: client.name,
          frontendUrl: this.config.get('FRONTEND_URL'),
          data: {
            thirtyDays: (consumablesByExpiration['30-days'] ?? []).map(
              mapToConsumableItem,
            ),
            sixtyDays: (consumablesByExpiration['60-days'] ?? []).map(
              mapToConsumableItem,
            ),
            ninetyDays: (consumablesByExpiration['90-days'] ?? []).map(
              mapToConsumableItem,
            ),
          },
        } satisfies React.ComponentProps<
          typeof MonthlyConsumableReportTemplateReact
        >;

        await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, {
          templateName: 'monthly_consumables_report',
          to: [user.email],
          templateProps: props,
        } satisfies SendEmailJobData<'monthly_consumables_report'>);
      }
    }

    return {};
  }

  private async sendInspectionAlertTriggeredEmail(
    job: Job<SendInspectionAlertTriggeredEmailJobData>,
  ) {
    const { alertId } = job.data;

    const alert = await this.prisma.bypassRLS().alert.findUniqueOrThrow({
      where: { id: alertId },
      include: {
        site: true,
        asset: {
          include: {
            product: {
              include: {
                productCategory: true,
              },
            },
          },
        },
        assetQuestionResponse: {
          include: {
            assetQuestion: true,
            responder: true,
          },
        },
      },
    });

    // All users for the client.
    const clientUsers = await this.getClientUsers(alert.clientId);

    // This mapping indicates which users should receive which reminder notification types.
    const usersByNotificationGroupId = getUsersGroupedByNotificationGroupId(
      clientUsers,
      [NotificationGroups.inspection_alert_triggered],
    );

    const genericProps: Omit<
      NonNullable<
        SendEmailJobData<'inspection_alert_triggered'>['templateProps']
      >,
      'recipientFirstName'
    > = {
      siteName: alert.site.name,
      alert: {
        id: alert.id,
        createdOn: alert.createdOn,
        alertLevel: alert.alertLevel,
        message: alert.message,
        questionPrompt: alert.assetQuestionResponse.assetQuestion.prompt,
        questionResponseValue: alert.assetQuestionResponse.value,
        inspectionImageUrl: alert.inspectionImageUrl,
      },
      asset: {
        id: alert.asset.id,
        name: alert.asset.name,
        serialNumber: alert.asset.serialNumber,
        location: alert.asset.location,
        placement: alert.asset.placement,
        categoryColor: alert.asset.product.productCategory.color,
        categoryName: alert.asset.product.productCategory.name,
        categoryIcon: alert.asset.product.productCategory.icon,
      },
      inspectorName: `${alert.assetQuestionResponse.responder.firstName} ${alert.assetQuestionResponse.responder.lastName}`,
      frontendUrl: this.config.get('FRONTEND_URL'),
    };

    for (const user of usersByNotificationGroupId.get(
      'inspection_alert_triggered',
    ) ?? []) {
      await this.notificationsQueue.add(NOTIFICATIONS_JOB_NAMES.SEND_EMAIL, {
        templateName: 'inspection_alert_triggered',
        to: [user.email],
        templateProps: {
          ...genericProps,
          recipientFirstName: user.firstName,
        },
      } satisfies SendEmailJobData<'inspection_alert_triggered'>);
    }
  }

  // Utility methods

  private async getClientUsers(clientId: string) {
    return this.users
      .findAll({ limit: 10000, offset: 0 }, clientId, true)
      .then((response) => response.results);
  }

  /**
   * Returns a mapping of asset scope to a list of sites and asset IDs. Used to efficiently determine
   * which users should have visibility into which assets.
   *
   * @param clientId The ID of the client to get the asset scope mappings for.
   * @returns A mapping of asset scope to a list of sites and asset IDs.
   */
  private async getAssetScopeMappings(clientId: string) {
    const sites = await this.prisma.bypassRLS().site.findMany({
      select: { id: true, externalId: true, name: true },
      where: { clientId },
    });

    // Client-level scopes (GLOBAL, SYSTEM) see all assets in the client
    // We only need to compute per-site mappings for more restricted scopes
    const clientLevelScopes: TScope[] = [
      RoleScope.CLIENT,
      RoleScope.SITE_GROUP,
      RoleScope.SITE,
      RoleScope.SELF,
    ];

    const assetScopeMappings: Partial<
      Record<
        TScope,
        {
          siteId: string;
          siteExternalId: string;
          siteName: string;
          assetIds: string[];
        }[]
      >
    > = {
      [RoleScope.CLIENT]: [],
      [RoleScope.SITE_GROUP]: [],
      [RoleScope.SITE]: [],
      [RoleScope.SELF]: [],
    };

    for (const scope of clientLevelScopes) {
      for (const site of sites) {
        const usersPrismaClient = await this.prisma.build({
          person: {
            id: '1',
            idpId: '1',
            siteId: site.id,
            allowedSiteIdsStr: site.id, // This accepts a comma-delimited list of site IDs.
            clientId: clientId,
            scope,
            capabilities: [],
            hasMultiClientScope: scopeAllowsMultipleClients(scope),
            hasMultiSiteScope: scopeAllowsAllClientSites(scope),
          },
        });
        const assetIds = await usersPrismaClient.asset
          .findMany({
            select: {
              id: true,
            },
          })
          .then((assets) => assets.map((a) => a.id));
        // Scope is one of the initialized keys, so this is safe
        assetScopeMappings[scope]!.push({
          siteId: site.id,
          siteExternalId: site.externalId,
          siteName: site.name,
          assetIds,
        });
      }
    }

    return assetScopeMappings;
  }
}

const INSPECTION_REMINDER_NOTIFICATION_GROUPS = Object.values(
  NotificationGroups,
).filter(isInspectionReminderNotificationGroup);

const INSPECTION_REMINDER_NOTIFICATION_GROUPS_THRESHOLD_ASC = [
  ...INSPECTION_REMINDER_NOTIFICATION_GROUPS,
].sort((a, b) => a.config.pctThreshold - b.config.pctThreshold);

type SharedInspectionReminderTemplateProps = React.ComponentProps<
  typeof InspectionReminderTemplateReact
> &
  React.ComponentProps<typeof InspectionDueSoonAlertLevel1TemplateReact> &
  React.ComponentProps<typeof InspectionDueSoonAlertLevel2TemplateReact> &
  React.ComponentProps<typeof InspectionDueSoonAlertLevel3TemplateReact> &
  React.ComponentProps<typeof InspectionDueSoonAlertLevel4TemplateReact>;

/**
 * Returns true if, given an inspection cycle and last inspected date, the threshold for the given notification group
 * will be met at any point today.
 *
 * @param props The inspection cycle, last inspected date, and threshold configuration.
 * @returns True if the threshold is met today, false otherwise.
 */
function isThresholdMetToday(props: {
  inspectionCycle: number;
  lastInspectedOn: Date;
  thresholdConfig: { pctThreshold: number; daysThreshold: number };
}) {
  // Get threshold a days, using the lesser of the static days or percent of inspection cycle.
  const pctThresholdAsDays =
    props.inspectionCycle * props.thresholdConfig.pctThreshold;
  const thresholdDays = Math.min(
    pctThresholdAsDays,
    props.thresholdConfig.daysThreshold,
  );

  // Calculate the date that the threshold will be met, using `addMilliseconds` to allow
  // for fractional days.
  const thresholdDate = addMilliseconds(
    props.lastInspectedOn,
    (props.inspectionCycle - thresholdDays) * 24 * 60 * 60 * 1000,
  );
  return isToday(thresholdDate);
}

/**
 * Returns the scope for a given role.
 *
 * @param role The role to get the scope for.
 * @returns The scope for the given role.
 */
function getRoleScope(role: Pick<Role, 'scope'>): TScope {
  return role.scope;
}

/**
 * Get the highest scope level across all of a user's roles.
 * Most permissive wins: SYSTEM > GLOBAL > CLIENT > SITE_GROUP > SITE > SELF
 */
function getUserScope(user: ClientUser): TScope {
  if (user.roles.length === 0) return RoleScope.SELF;

  // Get all scope levels from user's roles
  const scopeLevels = user.roles.map((role) => getRoleScope(role));

  if (scopeLevels.length === 0) return RoleScope.SELF;

  // Return the highest (most permissive) scope level
  // SCOPE_HIERARCHY is ordered from most to least permissive
  for (const scope of [
    RoleScope.SYSTEM,
    RoleScope.GLOBAL,
    RoleScope.CLIENT,
    RoleScope.SITE_GROUP,
    RoleScope.SITE,
    RoleScope.SELF,
  ]) {
    if (scopeLevels.includes(scope)) {
      return scope;
    }
  }

  return RoleScope.SELF;
}

/**
 * Check if a user is restricted to a single site.
 * Returns true only if ALL of the user's roles have SITE or SELF scope.
 */
function isSingleSiteUser(user: ClientUser) {
  if (user.roles.length === 0) return true;

  // Get all scope levels from user's roles
  const scopeLevels = user.roles.map((role) => getRoleScope(role));

  if (scopeLevels.length === 0) return true;

  // User is single-site only if ALL roles are SITE or SELF
  return scopeLevels.every((s) => s === RoleScope.SITE || s === RoleScope.SELF);
}

/**
 * Returns a mapping of notification group ID to a list of users that should receive notifications for that group.
 * A user receives notifications if ANY of their roles includes the notification group.
 *
 * @param users The users to group by notification group ID.
 * @returns A mapping of notification group ID to a list of users that should receive notifications for that group.
 */
function getUsersGroupedByNotificationGroupId(
  users: ClientUser[],
  notificationGroups: INotificationGroup[],
) {
  return new Map(
    notificationGroups.map((g) => [
      g.id,
      users.filter((u) => {
        if (u.roles.length === 0) {
          return false;
        }

        // Check if ANY of the user's roles includes this notification group
        return u.roles.some((role) => {
          return role.notificationGroups.includes(g.id);
        });
      }),
    ]),
  );
}

function getVisibleAssetIdsForUser(
  user: ClientUser,
  assetScopeMappings: Partial<
    Record<
      TScope,
      {
        siteId: string;
        siteExternalId: string;
        siteName: string;
        assetIds: string[];
      }[]
    >
  >,
) {
  const scope = getUserScope(user);

  // For GLOBAL and SYSTEM scopes, they have access to all assets (handled at query time)
  // For client-level scopes, look up from the mappings
  const scopeMapping = assetScopeMappings[scope];
  if (!scopeMapping) {
    // GLOBAL or SYSTEM - return empty since they're not in the mappings
    // (these users have access to everything)
    return [];
  }

  return (
    scopeMapping.find(
      ({ siteExternalId }) => siteExternalId === user.siteExternalId,
    )?.assetIds ?? []
  );
}
