import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel1TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel1TemplateReactProps =
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
            dueDate: addDays(new Date(), 14),
          },
          {
            assetId: '2',
            assetName: 'Main First Aid',
            categoryName: 'First Aid',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(246, 98, 106)',
            product: 'First Aid Cabinet',
            dueDate: addDays(new Date(), 14),
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
}: InspectionDueSoonAlertLevel1TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel1TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionDueSoonAlertLevel1TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE}
      urgency="soon"
    />
  );
}

InspectionDueSoonAlertLevel1TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel1TemplateReact.Subject = 'Inspections Due Soon';

InspectionDueSoonAlertLevel1TemplateReact.Text =
  InspectionDueSoonAlertLevel1TemplateText;
