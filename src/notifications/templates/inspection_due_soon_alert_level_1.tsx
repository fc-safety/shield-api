import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel1TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  | 'recipientFirstName'
  | 'assetsDueForInspectionBySite'
  | 'singleSite'
  | 'frontendUrl'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel1TemplateReactProps =
  {
    recipientFirstName: 'Michael',
    frontendUrl: 'http://localhost:5173',
    assetsDueForInspectionBySite: [
      {
        siteId: 'clz1a2b3c4d5e6f7g8h9i0j1',
        siteName: 'Central Distribution Center',
        assetsDueForInspection: [
          {
            assetId: 'clz1a2b3c4d5e6f7g8h9i0j2',
            assetName: 'Shipping Dock Fire Extinguisher #4',
            categoryId: 'clz1a2b3c4d5e6f7g8h9i0j3',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Ansul Sentry 20lb ABC Extinguisher',
            dueDate: addDays(new Date(), 12),
          },
          {
            assetId: 'clz1a2b3c4d5e6f7g8h9i0j4',
            assetName: 'Forklift Operator Station',
            categoryId: 'clz1a2b3c4d5e6f7g8h9i0j5',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'Industrial First Aid Station - ANSI Class A',
            dueDate: addDays(new Date(), 14),
          },
          {
            assetId: 'clz1a2b3c4d5e6f7g8h9i0j6',
            assetName: 'Chemical Storage Area Shower',
            categoryId: 'clz1a2b3c4d5e6f7g8h9i0j7',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-shower',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Guardian G1902 Emergency Shower & Eyewash',
            dueDate: addDays(new Date(), 13),
          },
        ],
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE =
  'The following assets are due soon for inspection and have not yet been inspected:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected ASAP, otherwise an alert will be escalated to your management team.';

function InspectionDueSoonAlertLevel1TemplateText({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel1TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE,
    frontendUrl,
  });
}

export default function InspectionDueSoonAlertLevel1TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel1TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE}
      urgency="soon"
      frontendUrl={frontendUrl}
    />
  );
}

InspectionDueSoonAlertLevel1TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel1TemplateReact.Subject = 'Inspections Due Soon';

InspectionDueSoonAlertLevel1TemplateReact.Text =
  InspectionDueSoonAlertLevel1TemplateText;
