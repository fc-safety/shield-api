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
import {
  buildSiteHierarchy,
  filterAssetsByVisibleSites,
  getVisibleAssetsForMember,
  getVisibleSiteIdsForMember,
  ISiteHierarchy,
  isSingleSiteUser,
  TPersonWithClientAccess,
} from 'src/auth/utils/site-visibility';
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
  onError(error: Error) {
    this.logger.error('Processor error', { error });
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
      case CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_INSPECTION_ALERT_TRIGGERED_EMAIL:
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
    const client = await this.prisma.bypassRLS().client.findUnique({
      where: { id: job.data.clientId },
    });

    if (!client) {
      this.logger.warn(
        `Client ${job.data.clientId} not found, skipping inspection reminders`,
      );
      return {};
    }

    if (client.demoMode) {
      this.logger.debug(
        `--> Skipping inspection reminders for demo client ${job.data.clientId}...`,
      );
      return {};
    }

    // This mapping indicates which users should receive which reminder notification types.
    const membersByNotificationGroupId =
      await this.getMembersByNotificationGroups(
        job.data.clientId,
        INSPECTION_REMINDER_NOTIFICATION_GROUPS.map((g) => g.id),
      );

    // Build site hierarchy for efficient visibility lookups.
    const siteHierarchy = await this.getSiteHierarchy(job.data.clientId);

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
          inspectionReminderBuckets.get(group.id)?.push(asset);
          break;
        }
      }
    }

    // Collect all email jobs to send in bulk.
    const emailJobs: {
      name: string;
      data: SendEmailJobData<NotificationGroupId>;
    }[] = [];

    // For each bucket, prepare notifications for users that should receive them.
    for (const [
      notificationGroupId,
      bucketAssets,
    ] of inspectionReminderBuckets.entries()) {
      const members = membersByNotificationGroupId[notificationGroupId] ?? [];

      if (bucketAssets.length === 0) {
        continue;
      }

      if (!members || members.length === 0) {
        this.logger.debug(
          `--> Skipping notification group "${notificationGroupId}" because there are no users to send to.`,
        );
        continue;
      }

      for (const member of members) {
        const visibleAssets = getVisibleAssetsForMember(
          member,
          job.data.clientId,
          bucketAssets,
          siteHierarchy,
        );

        // If user has no visibility into these assets, skip.
        if (visibleAssets.length === 0) {
          continue;
        }

        // Group assets to be displayed by site ID.
        const assetsBySite = groupBy(visibleAssets, (a) => a.site.id);

        // Prepare presentation properties to be passed to the template.
        const props: SharedInspectionReminderTemplateProps = {
          recipientFirstName: member.firstName,
          singleSite: isSingleSiteUser(member, job.data.clientId),
          frontendUrl: this.config.get('FRONTEND_URL'),
          assetsDueForInspectionBySite: Object.entries(assetsBySite).map(
            ([, siteAssets]) => ({
              siteId: siteAssets.at(0)?.site.id ?? 'unknown',
              siteName: siteAssets.at(0)?.site.name ?? 'Unknown',
              assetsDueForInspection: siteAssets.map((a) => ({
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

        emailJobs.push({
          name: NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          data: {
            templateName: notificationGroupId,
            to: [member.email],
            templateProps: props,
          },
        });
      }
    }

    // Send all notifications in bulk.
    if (emailJobs.length > 0) {
      await this.notificationsQueue.addBulk(emailJobs);
      this.logger.debug(
        `--> Queued ${emailJobs.length} inspection reminder emails for client ${job.data.clientId}`,
      );
    }

    return {};
  }

  private async processClientMonthlyInspectionReports(
    job: Job<ClientNotificationJobData>,
  ): Promise<any> {
    this.logger.debug(
      `--> Processing client monthly inspection reports for client ${job.data.clientId}...`,
    );

    const client = await this.prisma.bypassRLS().client.findUnique({
      where: { id: job.data.clientId },
    });

    if (!client) {
      this.logger.warn(
        `Client ${job.data.clientId} not found, skipping monthly reports`,
      );
      return {};
    }

    if (client.demoMode) {
      this.logger.debug(
        `--> Skipping monthly inspection reports for demo client ${job.data.clientId}...`,
      );
      return {};
    }

    // This mapping indicates which users should receive which reminder notification types.
    const membersByNotificationGroupId =
      await this.getMembersByNotificationGroups(job.data.clientId, [
        'monthly_compliance_report',
        'monthly_consumables_report',
      ]);

    // Build site hierarchy for efficient visibility lookups.
    const siteHierarchy = await this.getSiteHierarchy(job.data.clientId);

    // Collect all email jobs to send in bulk.
    const emailJobs: {
      name: string;
      data:
        | SendEmailJobData<'monthly_compliance_report'>
        | SendEmailJobData<'monthly_consumables_report'>;
    }[] = [];

    // Build monthly compliance reports.
    const monthlyComplianceReportMembers =
      membersByNotificationGroupId.monthly_compliance_report;
    if (
      monthlyComplianceReportMembers &&
      monthlyComplianceReportMembers.length > 0
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

      // For each user, determine visible assets and prepare the report.
      for (const member of monthlyComplianceReportMembers) {
        const visibleAssets = getVisibleAssetsForMember(
          member,
          job.data.clientId,
          assets,
          siteHierarchy,
        );

        if (visibleAssets.length === 0) {
          continue;
        }

        // Group assets to be displayed by site ID.
        const assetsBySite = groupBy(visibleAssets, (a) => a.site.id);

        const props = {
          recipientFirstName: member.firstName,
          clientName: client.name,
          singleSite: isSingleSiteUser(member, job.data.clientId),
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

        emailJobs.push({
          name: NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          data: {
            templateName: 'monthly_compliance_report',
            to: [member.email],
            templateProps: props,
          },
        });
      }
    }

    // Build monthly consumables reports.
    const monthlyConsumableReportMembers =
      membersByNotificationGroupId.monthly_consumables_report;
    if (
      monthlyConsumableReportMembers &&
      monthlyConsumableReportMembers.length > 0
    ) {
      const consumables = await this.prisma
        .bypassRLS()
        .consumable.findMany({
          where: {
            clientId: job.data.clientId,
            expiresOn: {
              gte: new Date(),
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

      for (const member of monthlyConsumableReportMembers) {
        // Get visible site IDs for this member
        const visibleSiteIds = getVisibleSiteIdsForMember(
          member,
          job.data.clientId,
          siteHierarchy,
        );

        // Filter consumables by their site (consumables have a direct site relationship)
        const visibleConsumables = filterAssetsByVisibleSites(
          consumables,
          visibleSiteIds,
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
          recipientFirstName: member.firstName,
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

        emailJobs.push({
          name: NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          data: {
            templateName: 'monthly_consumables_report',
            to: [member.email],
            templateProps: props,
          },
        });
      }
    }

    // Send all notifications in bulk.
    if (emailJobs.length > 0) {
      await this.notificationsQueue.addBulk(emailJobs);
      this.logger.debug(
        `--> Queued ${emailJobs.length} monthly report emails for client ${job.data.clientId}`,
      );
    }

    return {};
  }

  private async sendInspectionAlertTriggeredEmail(
    job: Job<SendInspectionAlertTriggeredEmailJobData>,
  ) {
    const { alertId } = job.data;

    const alert = await this.prisma.bypassRLS().alert.findUnique({
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

    if (!alert) {
      this.logger.warn(`Alert ${alertId} not found, skipping notification`);
      return;
    }

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

    const membersGroupedByNotificationId =
      await this.getMembersByNotificationGroups(alert.clientId, [
        NotificationGroups.inspection_alert_triggered.id,
      ]);

    // Build site hierarchy for visibility checks
    const siteHierarchy = await this.getSiteHierarchy(alert.clientId);

    // Collect email jobs for members with visibility to this alert's site
    const emailJobs: {
      name: string;
      data: SendEmailJobData<'inspection_alert_triggered'>;
    }[] = [];

    for (const member of membersGroupedByNotificationId[
      NotificationGroups.inspection_alert_triggered.id
    ] ?? []) {
      // Check if member can see this alert's site
      const visibleSiteIds = getVisibleSiteIdsForMember(
        member,
        alert.clientId,
        siteHierarchy,
      );

      // Skip if member doesn't have visibility to this site
      // (null means full access, so only skip if it's an array that doesn't include the site)
      if (visibleSiteIds !== null && !visibleSiteIds.includes(alert.siteId)) {
        continue;
      }

      emailJobs.push({
        name: NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
        data: {
          templateName: 'inspection_alert_triggered',
          to: [member.email],
          templateProps: {
            ...genericProps,
            recipientFirstName: member.firstName,
          },
        },
      });
    }

    // Send all notifications in bulk.
    if (emailJobs.length > 0) {
      await this.notificationsQueue.addBulk(emailJobs);
      this.logger.debug(
        `--> Queued ${emailJobs.length} alert notification emails for alert ${alertId}`,
      );
    }

    return {};
  }

  // Utility methods

  private async getMembersByNotificationGroups<
    const T extends readonly NotificationGroupId[],
  >(
    clientId: string,
    notificationGroupIds: T,
  ): Promise<Record<T[number], TPersonWithClientAccess[]>> {
    const people = await this.prisma.bypassRLS().person.findMany({
      where: {
        clientAccess: {
          some: {
            clientId,
            role: {
              notificationGroups: {
                hasSome: [...notificationGroupIds],
              },
            },
          },
        },
      },
      include: {
        clientAccess: {
          where: { clientId },
          include: {
            role: true,
          },
        },
      },
    });

    const grouped = {} as Record<T[number], TPersonWithClientAccess[]>;
    for (const id of notificationGroupIds) {
      grouped[id] = [];
    }

    for (const person of people) {
      for (const id of notificationGroupIds) {
        if (
          person.clientAccess.some((ca) =>
            ca.role.notificationGroups.includes(id),
          )
        ) {
          grouped[id].push(person);
        }
      }
    }

    return grouped;
  }

  /**
   * Build site hierarchy for a client. Used to determine which sites
   * a user can access based on their scope.
   *
   * @param clientId The ID of the client to get the site hierarchy for.
   * @returns Site hierarchy with precomputed descendants.
   */
  private async getSiteHierarchy(clientId: string): Promise<ISiteHierarchy> {
    const sites = await this.prisma.bypassRLS().site.findMany({
      select: { id: true, parentSiteId: true },
      where: { clientId },
    });

    return buildSiteHierarchy(sites);
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
  // Get threshold as days, using the lesser of the static days or percent of inspection cycle.
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
