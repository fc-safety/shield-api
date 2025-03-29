import {
  InjectQueue,
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job, Queue } from 'bullmq';
import { addDays, addMilliseconds, isToday } from 'date-fns';
import React from 'react';
import { Role } from 'src/admin/roles/model/role';
import { RolesService } from 'src/admin/roles/roles.service';
import { TVisibility, VISIBILITY_VALUES } from 'src/auth/permissions';
import { ClientUser } from 'src/clients/users/model/client-user';
import { UsersService } from 'src/clients/users/users.service';
import { extensions, PrismaService } from 'src/prisma/prisma.service';
import {
  CLIENT_NOTIFICATIONS_JOB_NAMES,
  QUEUE_NAMES,
  QUEUE_PREFIX,
} from '../lib/constants';
import { ClientNotificationJobData, SendEmailJobData } from '../lib/types';
import {
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

@Processor(QUEUE_NAMES.CLIENT_NOTIFICATIONS, { prefix: QUEUE_PREFIX })
export class ClientNotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(ClientNotificationsProcessor.name);

  private userRoleMapPromise: Promise<Map<string, Role>>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly roles: RolesService,
    private readonly users: UsersService,
    @InjectQueue(QUEUE_NAMES.CLIENT_NOTIFICATIONS)
    private readonly clientNotificationsQueue: Queue,
    private readonly notifications: NotificationsService,
  ) {
    super();
    this.userRoleMapPromise = this.roles
      .getRoles()
      .then((roles) => new Map(roles.map((r) => [r.name, r])));
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
    this.logger.debug(`Processing job ${job.id} of type ${job.name}...`, {
      jobData: job.data,
    });
  }

  async process(job: Job<unknown>): Promise<any> {
    switch (job.name) {
      case CLIENT_NOTIFICATIONS_JOB_NAMES.PROCESS_CLIENT_INSPECTION_REMINDERS:
        return await this.processClientInspectionReminders(
          job as Job<ClientNotificationJobData>,
        );
      case CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_EMAIL:
        return await this.sendEmail(job as Job<SendEmailJobData>);
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

    const userRoleMap = await this.userRoleMapPromise;

    const clientUsers = await this.getClientUsers(job.data.clientId);
    const usersByNotificationGroupId =
      await this.getUsersGroupedByNotificationGroupId(clientUsers);

    const assetVisibilityMappings = await this.getAssetVisibilityMappings(
      job.data.clientId,
    );

    /**
     * A mapping of notification group ID to a list of assets that should receive notifications for that group.
     */
    const inspectionReminderBuckets: Record<
      string,
      Prisma.AssetGetPayload<{
        include: {
          inspections: true;
          product: {
            include: {
              productCategory: true;
            };
          };
        };
      }>[]
    > = Object.fromEntries(
      INSPECTION_REMINDER_NOTIFICATION_GROUPS.map((g) => [g.id, []]),
    );

    // Group assets into buckets if they meet any of the notification group thresholds.
    const assets = await this.getClientAssetsWithLatestInspection(
      job.data.clientId,
    );
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
    for (const [notificationGroupId, assets] of Object.entries(
      inspectionReminderBuckets,
    )) {
      const users = usersByNotificationGroupId[notificationGroupId];

      if (assets.length === 0) {
        continue;
      }

      if (users.length === 0) {
        this.logger.debug(
          `--> Skipping notification group "${notificationGroupId}" because there are no users to send to.`,
        );
        continue;
      }

      for (const user of users) {
        const { template: Template, props } =
          this.getNotificationTemplateAndPropsForUser(
            notificationGroupId as keyof typeof INSPECTION_REMINDER_NOTIFICATION_GORUP_ID_TO_TEMPLATE_MAP,
            client,
            user,
            assets,
            assetVisibilityMappings,
            userRoleMap,
          );

        if (Template === undefined) {
          continue;
        }

        await this.clientNotificationsQueue.add(
          CLIENT_NOTIFICATIONS_JOB_NAMES.SEND_EMAIL,
          {
            notificationGroupId: notificationGroupId as NotificationGroupId,
            subject: Template.Subject,
            to: [user.email],
            templateProps: props,
          } satisfies SendEmailJobData,
        );
      }
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

    const Template =
      INSPECTION_REMINDER_NOTIFICATION_GORUP_ID_TO_TEMPLATE_MAP[
        notificationGroupId
      ];

    const text = Template.Text(templateProps);

    await this.notifications.sendEmail({
      subject,
      to,
      text,
      react: Template(templateProps),
    });
  }

  // Utility methods

  private async getClientAssetsWithLatestInspection(clientId: string) {
    return this.prisma.bypassRLS().asset.findMany({
      where: { clientId },
      include: {
        inspections: { orderBy: { createdOn: 'desc' }, take: 1 },
        product: { include: { productCategory: true } },
      },
    });
  }

  private async getClientUsers(clientId: string) {
    return this.users
      .findAll({ limit: 10000, offset: 0 }, clientId, 'admin', true)
      .then((response) => response.results);
  }

  /**
   * Returns a mapping of notification group ID to a list of users that should receive notifications for that group.
   *
   * @param users The users to group by notification group ID.
   * @returns A mapping of notification group ID to a list of users that should receive notifications for that group.
   */
  private async getUsersGroupedByNotificationGroupId(users: ClientUser[]) {
    const userRoleMap = await this.userRoleMapPromise;

    return Object.fromEntries(
      INSPECTION_REMINDER_NOTIFICATION_GROUPS.map((g) => [
        g.id,
        users.filter((u) => {
          if (u.roleName === undefined) {
            return false;
          }

          const role = userRoleMap.get(u.roleName);
          if (role === undefined) {
            return false;
          }

          return role.notificationGroups.includes(g.id);
        }),
      ]),
    );
  }

  /**
   * Returns a mapping of asset visibility to a list of sites and asset IDs. Used to efficiently determine
   * which users should have visibility to which assets.
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

  private getNotificationTemplateAndPropsForUser(
    notificationGroupId: keyof typeof INSPECTION_REMINDER_NOTIFICATION_GORUP_ID_TO_TEMPLATE_MAP,
    client: Prisma.ClientGetPayload<{
      select: {
        defaultInspectionCycle: true;
      };
    }>,
    ...passThroughArgs: Parameters<typeof filterAssetsForUser>
  ) {
    const template =
      INSPECTION_REMINDER_NOTIFICATION_GORUP_ID_TO_TEMPLATE_MAP[
        notificationGroupId
      ];

    const allowedAssets = filterAssetsForUser(...passThroughArgs);

    if (allowedAssets.length === 0) {
      return {
        template: undefined,
        props: undefined,
      };
    }

    const sharedProps: SharedInspectionReminderTemplateProps = {
      recipientFirstName: passThroughArgs[0].firstName,
      assetsDueForInspection: allowedAssets.map((a) => ({
        assetId: a.id,
        assetName: a.name,
        category: a.product.productCategory.name,
        product: a.product.name,
        dueDate: addDays(
          a.inspections.at(0)?.createdOn ?? a.createdOn,
          a.inspectionCycle ?? client.defaultInspectionCycle,
        ),
      })),
    };

    return {
      template,
      props: {
        ...sharedProps,
      } satisfies React.ComponentProps<typeof template>,
    };
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

const INSPECTION_REMINDER_NOTIFICATION_GORUP_ID_TO_TEMPLATE_MAP = {
  inspection_reminder: InspectionReminderTemplateReact,
  inspection_due_soon_alert_level_1: InspectionDueSoonAlertLevel1TemplateReact,
  inspection_due_soon_alert_level_2: InspectionDueSoonAlertLevel2TemplateReact,
  inspection_due_soon_alert_level_3: InspectionDueSoonAlertLevel3TemplateReact,
  inspection_due_soon_alert_level_4: InspectionDueSoonAlertLevel4TemplateReact,
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

  return visibility ?? 'self';
}

function filterAssetsForUser(
  user: ClientUser,
  assets: Prisma.AssetGetPayload<{
    include: {
      inspections: true;
      product: {
        include: { productCategory: true };
      };
    };
  }>[],
  assetVisibilityMappings: Record<
    Exclude<TVisibility, 'global'>,
    {
      siteId: string;
      siteExternalId: string;
      siteName: string;
      assetIds: string[];
    }[]
  >,
  userRoleMap: Map<string, Role>,
) {
  if (user.roleName === undefined) {
    return [];
  }

  const role = userRoleMap.get(user.roleName);
  const visibility = role ? getRoleVisibility(role) : 'self';

  const allowedIds =
    assetVisibilityMappings[visibility].find(
      ({ siteExternalId }) => siteExternalId === user.siteExternalId,
    )?.assetIds ?? [];

  return assets.filter((a) => allowedIds.includes(a.id));
}
