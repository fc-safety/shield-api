import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel1TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspection'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel1TemplateReactProps =
  {
    recipientFirstName: 'John',
    assetsDueForInspection: [
      {
        assetId: '1',
        assetName: 'Break Room Extinguisher',
        category: 'Fire Extinguishers',
        product: ' Class A Fire Extinguisher',
        dueDate: addDays(new Date(), 14),
      },
      {
        assetId: '2',
        assetName: 'Main First Aid',
        category: 'First Aid',
        product: 'First Aid Cabinet',
        dueDate: addDays(new Date(), 14),
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE =
  'The following assets are due soon for inspection and have not yet been inspected:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected ASAP, otherwise an alert will be escalated to your management team.';

function InspectionDueSoonAlertLevel1TemplateText({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel1TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_1_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel1TemplateReact({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel1TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspection={assetsDueForInspection}
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
