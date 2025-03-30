import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionReminderTemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite'
>;

export const INSPECTION_REMINDER_TEMPLATE_TEST_PROPS: InspectionReminderTemplateReactProps =
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
            dueDate: addDays(new Date(), 25),
          },
          {
            assetId: '2',
            assetName: 'Main First Aid',
            categoryName: 'First Aid',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(246, 98, 106)',
            product: 'First Aid Cabinet',
            dueDate: addDays(new Date(), 25),
          },
        ],
      },
    ],
  };

const INSPECTION_REMINDER_TEXT_OPENING_MESSAGE =
  'This is a reminder that the following assets will be due for inspection soon:';
const INSPECTION_REMINDER_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected before the due date.';

function InspectionReminderTemplateText({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionReminderTemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_REMINDER_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_REMINDER_TEXT_CLOSING_MESSAGE,
  });
}

export default function InspectionReminderTemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
}: InspectionReminderTemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_REMINDER_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_REMINDER_TEXT_CLOSING_MESSAGE}
      urgency="normal"
    />
  );
}

InspectionReminderTemplateReact.PreviewProps = {
  ...INSPECTION_REMINDER_TEMPLATE_TEST_PROPS,
};

InspectionReminderTemplateReact.Subject = 'Inspection Reminder';

InspectionReminderTemplateReact.Text = InspectionReminderTemplateText;
