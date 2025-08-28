import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel4TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite' | 'frontendUrl'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel4TemplateReactProps =
  {
    recipientFirstName: 'Robert',
    frontendUrl: 'http://localhost:5173',
    assetsDueForInspectionBySite: [
      {
        siteId: 'clz4d5e6f7g8h9i0j1k2l3m4',
        siteName: 'Phoenix Data Center',
        assetsDueForInspection: [
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3m5',
            assetName: 'Server Room Fire Extinguisher',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3m6',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Kidde Pro 210 Fire Extinguisher',
            dueDate: addDays(new Date(), 2),
          },
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3m7',
            assetName: 'Emergency Command Center AED',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3m8',
            categoryName: 'AED',
            categoryIcon: 'fa-heart-pulse',
            categoryColor: 'rgb(236, 72, 153)',
            product: 'ZOLL AED Plus with Cabinet',
            dueDate: addDays(new Date(), 1),
          },
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3m9',
            assetName: 'Battery Room Eye Wash Station',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3n0',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-eye',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Guardian Emergency Eyewash',
            dueDate: addDays(new Date(), 3),
          },
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3n1',
            assetName: 'Generator Room First Aid Cabinet',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3n2',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'Industrial First Aid Cabinet',
            dueDate: addDays(new Date(), 2),
          },
        ],
      },
      {
        siteId: 'clz4d5e6f7g8h9i0j1k2l3n5',
        siteName: 'Research Laboratory Building',
        assetsDueForInspection: [
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3n6',
            assetName: 'Lab Fire Extinguisher',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3n7',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Amerex B402 ABC Fire Extinguisher',
            dueDate: addDays(new Date(), 2),
          },
          {
            assetId: 'clz4d5e6f7g8h9i0j1k2l3n8',
            assetName: 'Chemical Storage Eye Wash Station',
            categoryId: 'clz4d5e6f7g8h9i0j1k2l3n9',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-eye',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Haws 8300 Combination Eyewash',
            dueDate: addDays(new Date(), 3),
          },
        ],
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_OPENING_MESSAGE =
  'The following assets will soon be non-compliant and require immediate attention:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_CLOSING_MESSAGE =
  'To avoid non-compliance, please ensure that these assets are inspected before the due date.';

function InspectionDueSoonAlertLevel4TemplateText({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel4TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_CLOSING_MESSAGE,
    frontendUrl,
  });
}

export default function InspectionDueSoonAlertLevel4TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel4TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_CLOSING_MESSAGE}
      urgency="critical"
      frontendUrl={frontendUrl}
    />
  );
}

InspectionDueSoonAlertLevel4TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel4TemplateReact.Subject =
  'Compliance Alert: Inspections Due Soon';

InspectionDueSoonAlertLevel4TemplateReact.Text =
  InspectionDueSoonAlertLevel4TemplateText;
