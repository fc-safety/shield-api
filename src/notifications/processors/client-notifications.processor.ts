import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { addDays, addMilliseconds, isBefore, isToday } from 'date-fns';
import React from 'react';
import { Role } from 'src/admin/roles/model/role';
import { RolesService } from 'src/admin/roles/roles.service';
import { TVisibility, VISIBILITY_VALUES } from 'src/auth/permissions';
import { ClientUser } from 'src/clients/users/model/client-user';
import { UsersService } from 'src/clients/users/users.service';
import { groupBy } from 'src/common/utils';
import { extensions, PrismaService } from 'src/prisma/prisma.service';
import {
  CLIENT_NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '../lib/constants';
import { ClientNotificationJobData, SendEmailJobData } from '../lib/types';
import {
  INotificationGroup,
  isInspectionReminderNotificationGroup,
  NotificationGroupId,
  NotificationGroups,
} from '../notification-types';
import { NotificationsService } from '../notifications.service';
import InspectionDueSoonAlertLevel1TemplateReact from '../templates/inspection_due_soon_alert_level_1';
import InspectionDueSoonAlertLevel2TemplateReact from '../templates/inspection_due_soon_alert_level_2';
import InspectionDueSoonAlertLevel3TemplateReact from '../templates/inspection_due_soon_alert_level_3';
import InspectionDueSoonAlertLevel4TemplateReact from '../templates/inspection_due_soon_alert_level_4';
import InspectionReminderTemplateReact from '../templates/inspection_reminder';
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
export class ClientNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(ClientNotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    private readonly users: UsersService,
    @InjectQueue(QUEUE_NAMES.CLIENT_NOTIFICATIONS)
    private readonly clientNotificationsQueue: Queue,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  @OnWorkerEvent('failed')
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
      case CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_EMAIL:
        return await this.sendEmail(job as Job<SendEmailJobData>);
      case CLIENT_NOTIFICATIONS_JOB_NAMES.PROCESS_CLIENT_MONTHLY_INSPECTION_REPORTS:
        return await this.processClientMonthlyInspectionReports(
          job as Job<ClientNotificationJobData>,
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

    // Map of role name to role.
    const roleMap = await this.getRoleMap();

    // All users for the client.
    const clientUsers = await this.getClientUsers(job.data.clientId);

    // This mapping indicates which users should receive which reminder notification types.
    const usersByNotificationGroupId = getUsersGroupedByNotificationGroupId(
      clientUsers,
      roleMap,
      INSPECTION_REMINDER_NOTIFICATION_GROUPS,
    );

    // These mappings indicate which user roles should have visibility into which client assets.
    const assetVisibilityMappings = await this.getAssetVisibilityMappings(
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
          inspectionReminderBuckets[group.id].push(asset);
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
          assetVisibilityMappings,
          roleMap,
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
          singleSite: isSingleSiteUser(user, roleMap),
          assetsDueForInspectionBySite: Object.entries(assetsBySite).map(
            ([, assets]) => ({
              siteName: assets.at(0)?.site.name ?? 'Unknown',
              assetsDueForInspection: assets.map((a) => ({
                assetId: a.id,
                assetName: a.name,
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

        await this.clientNotificationsQueue.add(
          CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          {
            notificationGroupId: notificationGroupId as NotificationGroupId,
            to: [user.email],
            templateProps: props,
          } satisfies SendEmailJobData,
        );
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

    // Map of role name to role.
    const roleMap = await this.getRoleMap();

    // All users for the client.
    const clientUsers = await this.getClientUsers(job.data.clientId);

    // This mapping indicates which users should receive which reminder notification types.
    const usersByNotificationGroupId = getUsersGroupedByNotificationGroupId(
      clientUsers,
      roleMap,
      Object.values(NotificationGroups).filter((g) =>
        ['monthly_compliance_report', 'asset_compliance_report'].includes(g.id),
      ),
    );

    // These mappings indicate which user roles should have visibility into which client assets.
    const assetVisibilityMappings = await this.getAssetVisibilityMappings(
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
          assetVisibilityMappings,
          roleMap,
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
          singleSite: isSingleSiteUser(user, roleMap),
          reportRowsBySite: Object.entries(assetsBySite).map(
            ([, siteAssets]) => {
              const assetsByCategory = groupBy(
                siteAssets,
                (a) => a.product.productCategory.id,
              );

              return {
                siteName: siteAssets.at(0)?.site.name ?? 'Unknown',
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

                    return {
                      categoryName:
                        categoryAssets.at(0)?.product.productCategory.name ??
                        'Unknown',
                      categoryIcon:
                        categoryAssets.at(0)?.product.productCategory.icon ??
                        undefined,
                      categoryColor:
                        categoryAssets.at(0)?.product.productCategory.color ??
                        undefined,
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

        await this.clientNotificationsQueue.add(
          CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          {
            notificationGroupId: 'monthly_compliance_report',
            to: [user.email],
            templateProps: props,
          } satisfies SendEmailJobData,
        );
      }
    }

    // Build and send asset compliance reports.
    const assetComplianceReportUsers = usersByNotificationGroupId.get(
      'asset_compliance_report',
    );
    if (assetComplianceReportUsers && assetComplianceReportUsers.length > 0) {
      // todo
    }

    return {};
  }

  /**
   * Sends an email.
   *
   * @param job The job to send the email for.
   * @returns The result of the job.
   */
  private async sendEmail(job: Job<SendEmailJobData>) {
    const { notificationGroupId, subject, to, templateProps } = job.data;

    const Template = NOTIFICATION_GROUP_ID_TO_TEMPLATE_MAP[notificationGroupId];

    if (!Template) {
      throw new Error(
        `Template for notification group "${notificationGroupId}" is not defined.`,
      );
    }

    if (!subject && !Template.Subject) {
      throw new Error(
        `Subject for notification group "${notificationGroupId}" is not defined.`,
      );
    }

    const text = Template.Text(templateProps);

    await this.notifications.sendEmail({
      subject: subject ?? Template.Subject,
      to,
      text,
      react: Template(templateProps),
    });
  }

  // Utility methods

  private async getClientUsers(clientId: string) {
    return this.users
      .findAll({ limit: 10000, offset: 0 }, clientId, 'admin', true)
      .then((response) => response.results);
  }

  private async getRoleMap() {
    return this.roles
      .getRoles()
      .then((roles) => new Map(roles.map((r) => [r.name, r])));
  }

  /**
   * Returns a mapping of asset visibility to a list of sites and asset IDs. Used to efficiently determine
   * which users should have visibility into which assets.
   *
   * @param clientId The ID of the client to get the asset visibility mappings for.
   * @returns A mapping of asset visibility to a list of sites and asset IDs.
   */
  private async getAssetVisibilityMappings(clientId: string) {
    const sites = await this.prisma.bypassRLS().site.findMany({
      select: { id: true, externalId: true, name: true },
      where: { clientId },
    });

    const assetVisibilityMappings: Record<
      Exclude<TVisibility, 'global'>,
      {
        siteId: string;
        siteExternalId: string;
        siteName: string;
        assetIds: string[];
      }[]
    > = {
      'client-sites': [],
      'multi-site': [],
      'site-group': [],
      'single-site': [],
      self: [],
    };

    for (const visibility of VISIBILITY_VALUES) {
      if (visibility === 'global') {
        continue;
      }

      for (const site of sites) {
        const assetIds = await this.prisma
          .$extends(
            extensions.forUser({
              id: '1',
              idpId: '1',
              siteId: site.id,
              allowedSiteIds: site.id, // This accepts a comma-delimited list of site IDs.
              clientId: clientId,
              visibility,
            }),
          )
          .asset.findMany({
            select: {
              id: true,
            },
          })
          .then((assets) => assets.map((a) => a.id));
        assetVisibilityMappings[visibility].push({
          siteId: site.id,
          siteExternalId: site.externalId,
          siteName: site.name,
          assetIds,
        });
      }
    }

    return assetVisibilityMappings;
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

const NOTIFICATION_GROUP_ID_TO_TEMPLATE_MAP = {
  inspection_reminder: InspectionReminderTemplateReact,
  inspection_due_soon_alert_level_1: InspectionDueSoonAlertLevel1TemplateReact,
  inspection_due_soon_alert_level_2: InspectionDueSoonAlertLevel2TemplateReact,
  inspection_due_soon_alert_level_3: InspectionDueSoonAlertLevel3TemplateReact,
  inspection_due_soon_alert_level_4: InspectionDueSoonAlertLevel4TemplateReact,
  monthly_compliance_report: MonthlyInspectionReportTemplateReact,
  // asset_compliance_report: AssetComplianceReportTemplateReact,
} as const satisfies Partial<Record<NotificationGroupId, React.FC<any>>>;

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
 * Returns the visibility for a given role.
 *
 * @param role The role to get the visibility for.
 * @returns The visibility for the given role.
 */
function getRoleVisibility(role: Role) {
  const visibility = role.permissions
    .find((p) => p.includes('visibility'))
    ?.split(':')
    .at(-1);

  return (visibility ?? 'self') as TVisibility;
}

function getUserVisibility(
  user: ClientUser,
  roleMap: Map<string, Role>,
): TVisibility {
  if (!user.roleName) return 'self';
  const role = roleMap.get(user.roleName);
  return role ? getRoleVisibility(role) : 'self';
}

function isSingleSiteUser(user: ClientUser, roleMap: Map<string, Role>) {
  if (!user.roleName) return true;
  const role = roleMap.get(user.roleName);
  return role
    ? ['single-site', 'self'].includes(getRoleVisibility(role))
    : true;
}

/**
 * Returns a mapping of notification group ID to a list of users that should receive notifications for that group.
 *
 * @param users The users to group by notification group ID.
 * @returns A mapping of notification group ID to a list of users that should receive notifications for that group.
 */
function getUsersGroupedByNotificationGroupId(
  users: ClientUser[],
  roleMap: Map<string, Role>,
  notificationGroups: INotificationGroup[],
) {
  return new Map(
    notificationGroups.map((g) => [
      g.id,
      users.filter((u) => {
        if (u.roleName === undefined) {
          return false;
        }

        const role = roleMap.get(u.roleName);
        if (role === undefined) {
          return false;
        }

        return role.notificationGroups.includes(g.id);
      }),
    ]),
  );
}

function getVisibleAssetIdsForUser(
  user: ClientUser,
  assetVisibilityMappings: Record<
    Exclude<TVisibility, 'global'>,
    {
      siteId: string;
      siteExternalId: string;
      siteName: string;
      assetIds: string[];
    }[]
  >,
  roleMap: Map<string, Role>,
) {
  const visibility = getUserVisibility(user, roleMap);

  return (
    assetVisibilityMappings[visibility].find(
      ({ siteExternalId }) => siteExternalId === user.siteExternalId,
    )?.assetIds ?? []
  );
}
