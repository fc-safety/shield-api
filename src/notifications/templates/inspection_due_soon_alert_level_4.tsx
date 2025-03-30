import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel4TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel4TemplateReactProps =
  {
    recipientFirstName: 'John',
    assetsDueForInspectionBySite: [
      {
        siteName: 'Site 1',
        assetsDueForInspection: [
          {
            assetId: '1',
            assetName: 'Break Room Extinguisher',
            categoryName: 'Fire Extinguishers',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(253, 11, 55)',
            product: ' Class A Fire Extinguisher',
            dueDate: addDays(new Date(), 3),
          },
          {
            assetId: '2',
            assetName: 'Main First Aid',
            categoryName: 'First Aid',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(246, 98, 106)',
            product: 'First Aid Cabinet',
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
}: InspectionDueSoonAlertLevel4TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel4TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionDueSoonAlertLevel4TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_4_TEXT_CLOSING_MESSAGE}
      urgency="critical"
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
