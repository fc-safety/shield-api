import InspectionDueSoonAlertLevel1TemplateReact from '../templates/inspection_due_soon_alert_level_1';
import InspectionDueSoonAlertLevel2TemplateReact from '../templates/inspection_due_soon_alert_level_2';
import InspectionDueSoonAlertLevel3TemplateReact from '../templates/inspection_due_soon_alert_level_3';
import InspectionDueSoonAlertLevel4TemplateReact from '../templates/inspection_due_soon_alert_level_4';
import InspectionReminderTemplateReact from '../templates/inspection_reminder';
import MonthlyInspectionReportTemplateReact from '../templates/monthly_inspection_report';
import NewProductRequestTemplateReact from '../templates/new-product-request';
import TeamInspectionReminderTemplateReact from '../templates/team-inspection-reminder';

export const TEMPLATE_NAME_MAP = {
  // Client notification reminder templates
  inspection_reminder: InspectionReminderTemplateReact,
  inspection_due_soon_alert_level_1: InspectionDueSoonAlertLevel1TemplateReact,
  inspection_due_soon_alert_level_2: InspectionDueSoonAlertLevel2TemplateReact,
  inspection_due_soon_alert_level_3: InspectionDueSoonAlertLevel3TemplateReact,
  inspection_due_soon_alert_level_4: InspectionDueSoonAlertLevel4TemplateReact,
  monthly_compliance_report: MonthlyInspectionReportTemplateReact,
  // asset_compliance_report: AssetComplianceReportTemplateReact,

  // Other templates
  new_product_request: NewProductRequestTemplateReact,
  team_inspection_reminder: TeamInspectionReminderTemplateReact,
} as const satisfies Record<string, React.FC<any>>;
