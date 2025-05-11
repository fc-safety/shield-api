export const NotificationGroupIds = [
  'inspection_reminder',
  'inspection_due_soon_alert_level_1',
  'inspection_due_soon_alert_level_2',
  'inspection_due_soon_alert_level_3',
  'inspection_due_soon_alert_level_4',
  'monthly_compliance_report',
  'monthly_consumables_report',
  'inspection_alert_triggered',
] as const;
export type NotificationGroupId = (typeof NotificationGroupIds)[number];

export type INotificationGroup = {
  id: NotificationGroupId;
  name: string;
  description: string;
  config?: Record<string, number | string>;
};

export const NotificationGroups: Record<
  NotificationGroupId,
  INotificationGroup
> = {
  inspection_reminder: {
    id: 'inspection_reminder',
    name: 'Inspection Reminder',
    description:
      "Initial reminder for inspections due in the next 25 days, or within 85% of the asset's inspection period, whichever is less.",
    config: {
      pctThreshold: 0.85,
      daysThreshold: 25,
    },
  },
  inspection_due_soon_alert_level_1: {
    id: 'inspection_due_soon_alert_level_1',
    name: 'Inspection Due Soon Alert (Level 1)',
    description:
      "Level 1: Alert for inspections due in the next 14 days, or within 50% of the asset's inspection period, whichever is less.",
    config: {
      pctThreshold: 0.5,
      daysThreshold: 14,
    },
  },
  inspection_due_soon_alert_level_2: {
    id: 'inspection_due_soon_alert_level_2',
    name: 'Inspection Due Soon Alert (Level 2)',
    description:
      "Level 2: Alert for inspections due in the next 10 days, or within 35% of the asset's inspection period, whichever is less.",
    config: {
      pctThreshold: 0.35,
      daysThreshold: 10,
    },
  },
  inspection_due_soon_alert_level_3: {
    id: 'inspection_due_soon_alert_level_3',
    name: 'Inspection Due Soon Alert (Level 3)',
    description:
      "Level 3: Alert for inspections due in the next 7 days, or within 25% of the asset's inspection period, whichever is less.",
    config: {
      pctThreshold: 0.25,
      daysThreshold: 7,
    },
  },
  inspection_due_soon_alert_level_4: {
    id: 'inspection_due_soon_alert_level_4',
    name: 'Inspection Due Soon Alert (Level 4)',
    description:
      "Level 4: Alert for inspections due in the next 3 days, or within 15% of the asset's inspection period, whichever is less.",
    config: {
      pctThreshold: 0.15,
      daysThreshold: 3,
    },
  },
  monthly_compliance_report: {
    id: 'monthly_compliance_report',
    name: 'Monthly Compliance Report',
    description: 'Monthly report of asset compliance.',
  },
  monthly_consumables_report: {
    id: 'monthly_consumables_report',
    name: 'Monthly Consumables Report',
    description: 'Monthly report of consumables expiring soon.',
  },
  inspection_alert_triggered: {
    id: 'inspection_alert_triggered',
    name: 'Inspection Alert Triggered',
    description:
      'Receive a notification when an inspection alert is triggered.',
  },
};

export function isInspectionReminderNotificationGroup(
  group: INotificationGroup,
): group is INotificationGroup & {
  config: {
    pctThreshold: number;
    daysThreshold: number;
  };
} {
  return (
    group.config !== undefined &&
    'pctThreshold' in group.config &&
    'daysThreshold' in group.config
  );
}

/**
 * The minimum inspection cycle that can be used for a client or client asset where
 * inspection reminders can still span full days.
 */
export const MINIMUM_INSPECTION_CYCLE = Math.ceil(
  1 /
    Object.values(NotificationGroups)
      .filter(isInspectionReminderNotificationGroup)
      .reduce((min, group) => {
        return Math.min(min, group.config.pctThreshold);
      }, Infinity),
);
