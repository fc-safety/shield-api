import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel3TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspection'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel3TemplateReactProps =
  {
    recipientFirstName: 'John',
    assetsDueForInspection: [
      {
        assetId: '1',
        assetName: 'Break Room Extinguisher',
        category: 'Fire Extinguishers',
        product: ' Class A Fire Extinguisher',
        dueDate: addDays(new Date(), 7),
      },
      {
        assetId: '2',
        assetName: 'Main First Aid',
        category: 'First Aid',
        product: 'First Aid Cabinet',
        dueDate: addDays(new Date(), 7),
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE =
  'The following assets have not yet been inspected and will soon be non-compliant:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected before the due date to avoid non-compliance.';

function InspectionDueSoonAlertLevel3TemplateText({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel3TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionDueSoonAlertLevel3TemplateReact({
  recipientFirstName,
  assetsDueForInspection,
}: InspectionDueSoonAlertLevel3TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspection={assetsDueForInspection}
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
