import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel3TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel3TemplateReactProps =
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
            dueDate: addDays(new Date(), 7),
          },
          {
            assetId: '2',
            assetName: 'Main First Aid',
            categoryName: 'First Aid',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(246, 98, 106)',
            product: 'First Aid Cabinet',
            dueDate: addDays(new Date(), 7),
          },
        ],
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE =
  'The following assets have not yet been inspected and will soon be non-compliant:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected before the due date to avoid non-compliance.';

function InspectionDueSoonAlertLevel3TemplateText({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionDueSoonAlertLevel3TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel3TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionDueSoonAlertLevel3TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE}
      urgency="urgent"
    />
  );
}

InspectionDueSoonAlertLevel3TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel3TemplateReact.Subject =
  'Compliance Alert: Inspections Due Soon';

InspectionDueSoonAlertLevel3TemplateReact.Text =
  InspectionDueSoonAlertLevel3TemplateText;
