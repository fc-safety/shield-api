import React from 'react';
import InspectionAlertTriggeredTemplateReact from '../templates/inspection_alert_triggered';
import InspectionDueSoonAlertLevel1TemplateReact from '../templates/inspection_due_soon_alert_level_1';
import InspectionDueSoonAlertLevel2TemplateReact from '../templates/inspection_due_soon_alert_level_2';
import InspectionDueSoonAlertLevel3TemplateReact from '../templates/inspection_due_soon_alert_level_3';
import InspectionDueSoonAlertLevel4TemplateReact from '../templates/inspection_due_soon_alert_level_4';
import InspectionReminderTemplateReact from '../templates/inspection_reminder';
import ManagerPasswordResetTemplateReact from '../templates/manager_password_reset';
import MonthlyConsumableReportTemplateReact from '../templates/monthly_consumables_report';
import MonthlyInspectionReportTemplateReact from '../templates/monthly_inspection_report';
import NewLandingFormLeadTemplateReact from '../templates/new-landing-form-lead';
import NewProductRequestTemplateReact from '../templates/new-product-request';
import TeamInspectionReminderTemplateReact from '../templates/team-inspection-reminder';
import TestTemplateReact from '../templates/test';

export const TEMPLATE_NAME_MAP = {
  // Automatic client notification reminder templates
  inspection_reminder: InspectionReminderTemplateReact,
  inspection_due_soon_alert_level_1: InspectionDueSoonAlertLevel1TemplateReact,
  inspection_due_soon_alert_level_2: InspectionDueSoonAlertLevel2TemplateReact,
  inspection_due_soon_alert_level_3: InspectionDueSoonAlertLevel3TemplateReact,
  inspection_due_soon_alert_level_4: InspectionDueSoonAlertLevel4TemplateReact,
  monthly_compliance_report: MonthlyInspectionReportTemplateReact,
  monthly_consumables_report: MonthlyConsumableReportTemplateReact,

  // Other automatic client templates
  inspection_alert_triggered: InspectionAlertTriggeredTemplateReact,

  // Other general templates
  new_product_request: NewProductRequestTemplateReact,
  team_inspection_reminder: TeamInspectionReminderTemplateReact,
  manager_password_reset: ManagerPasswordResetTemplateReact,
  new_landing_form_lead: NewLandingFormLeadTemplateReact,
  test: TestTemplateReact,
} as const satisfies Record<
  string,
  React.FC<any> & {
    Subject: string;
    Text: (props: any) => string;
    // TODO: Make required once we fully implement SMS notifications.
    Sms?: (props: any) => string;
  }
>;

export type NotificationTemplateId = keyof typeof TEMPLATE_NAME_MAP;

export interface SendEmailJobData<T extends NotificationTemplateId> {
  templateName: T;
  subject?: string;
  to: string[];
  templateProps?: React.ComponentProps<(typeof TEMPLATE_NAME_MAP)[T]>;
  replyTo?: string;
}
