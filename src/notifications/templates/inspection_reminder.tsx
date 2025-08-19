import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionReminderTemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite' | 'frontendUrl'
>;

export const INSPECTION_REMINDER_TEMPLATE_TEST_PROPS: InspectionReminderTemplateReactProps =
  {
    recipientFirstName: 'Sarah',
    frontendUrl: 'http://localhost:5173',
    assetsDueForInspectionBySite: [
      {
        siteId: 'cly8k9j2m0001qwerty123456',
        siteName: 'Downtown Manufacturing Facility',
        assetsDueForInspection: [
          {
            assetId: 'cly8k9j2m0002qwerty654321',
            assetName: 'Warehouse Entry Extinguisher',
            categoryId: 'cly8k9j2m0003qwerty111111',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Amerex B402 ABC Fire Extinguisher',
            dueDate: addDays(new Date(), 28),
          },
          {
            assetId: 'cly8k9j2m0004qwerty222222',
            assetName: 'Production Floor Station #3',
            categoryId: 'cly8k9j2m0005qwerty333333',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'ANSI Class B First Aid Cabinet',
            dueDate: addDays(new Date(), 30),
          },
          {
            assetId: 'cly8k9j2m0006qwerty444444',
            assetName: 'Loading Dock Eyewash',
            categoryId: 'cly8k9j2m0007qwerty555555',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-eye',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Bradley S19-921 Plumbed Eyewash Station',
            dueDate: addDays(new Date(), 26),
          },
        ],
      },
      {
        siteId: 'cly8k9j2m0008qwerty666666',
        siteName: 'North Regional Office',
        assetsDueForInspection: [
          {
            assetId: 'cly8k9j2m0009qwerty777777',
            assetName: 'Kitchen Area Extinguisher',
            categoryId: 'cly8k9j2m0003qwerty111111',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Kidde Pro 210 Fire Extinguisher',
            dueDate: addDays(new Date(), 29),
          },
          {
            assetId: 'cly8k9j2m0010qwerty888888',
            assetName: 'Reception First Aid Kit',
            categoryId: 'cly8k9j2m0005qwerty333333',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'Office First Aid Kit 25-Person',
            dueDate: addDays(new Date(), 27),
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
  frontendUrl,
}: InspectionReminderTemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_REMINDER_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_REMINDER_TEXT_CLOSING_MESSAGE,
    frontendUrl,
  });
}

export default function InspectionReminderTemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionReminderTemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_REMINDER_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_REMINDER_TEXT_CLOSING_MESSAGE}
      urgency="normal"
      frontendUrl={frontendUrl}
    />
  );
}

InspectionReminderTemplateReact.PreviewProps = {
  ...INSPECTION_REMINDER_TEMPLATE_TEST_PROPS,
};

InspectionReminderTemplateReact.Subject = 'Inspection Reminder';

InspectionReminderTemplateReact.Text = InspectionReminderTemplateText;
