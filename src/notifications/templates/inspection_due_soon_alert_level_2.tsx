import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel2TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspection'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel2TemplateReactProps =
  {
    recipientFirstName: 'John',
    assetsDueForInspection: [
      {
        assetId: '1',
        assetName: 'Break Room Extinguisher',
        category: 'Fire Extinguishers',
        product: ' Class A Fire Extinguisher',
        dueDate: addDays(new Date(), 10),
      },
      {
        assetId: '2',
        assetName: 'Main First Aid',
        category: 'First Aid',
        product: 'First Aid Cabinet',
        dueDate: addDays(new Date(), 10),
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE =
  'The following assets are due very soon for inspection and have not yet been inspected:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected ASAP, otherwise an alert will be escalated to your management team.';

function InspectionDueSoonAlertLevel2TemplateText({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel2TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel2TemplateReact({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel2TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspection={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE}
      urgency="very_soon"
    />
  );
}

InspectionDueSoonAlertLevel2TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel2TemplateReact.Subject = 'Inspections Due Soon';

InspectionDueSoonAlertLevel2TemplateReact.Text =
  InspectionDueSoonAlertLevel2TemplateText;
