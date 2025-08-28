import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel3TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite' | 'frontendUrl'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel3TemplateReactProps =
  {
    recipientFirstName: 'David',
    frontendUrl: 'http://localhost:5173',
    assetsDueForInspectionBySite: [
      {
        siteId: 'clz3c4d5e6f7g8h9i0j1k2l3',
        siteName: 'Houston Manufacturing Plant',
        assetsDueForInspection: [
          {
            assetId: 'clz3c4d5e6f7g8h9i0j1k2l4',
            assetName: 'Welding Bay Fire Extinguisher',
            categoryId: 'clz3c4d5e6f7g8h9i0j1k2l5',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Amerex B10BC Carbon Dioxide Extinguisher',
            dueDate: addDays(new Date(), 5),
          },
          {
            assetId: 'clz3c4d5e6f7g8h9i0j1k2l6',
            assetName: 'Machine Shop First Aid Cabinet',
            categoryId: 'clz3c4d5e6f7g8h9i0j1k2l7',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'Industrial First Aid Cabinet',
            dueDate: addDays(new Date(), 6),
          },
          {
            assetId: 'clz3c4d5e6f7g8h9i0j1k2l8',
            assetName: 'Chemical Lab Eye Wash Station',
            categoryId: 'clz3c4d5e6f7g8h9i0j1k2l9',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-eye',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Bradley Combination Eyewash/Shower',
            dueDate: addDays(new Date(), 7),
          },
          {
            assetId: 'clz3c4d5e6f7g8h9i0j1k2m0',
            assetName: 'Emergency Response AED - Building A',
            categoryId: 'clz3c4d5e6f7g8h9i0j1k2m1',
            categoryName: 'AED',
            categoryIcon: 'fa-heart-pulse',
            categoryColor: 'rgb(236, 72, 153)',
            product: 'ZOLL AED Plus with Cabinet',
            dueDate: addDays(new Date(), 5),
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
  frontendUrl,
}: InspectionDueSoonAlertLevel3TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE,
    frontendUrl,
  });
}

export default function InspectionDueSoonAlertLevel3TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel3TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_3_TEXT_CLOSING_MESSAGE}
      urgency="urgent"
      frontendUrl={frontendUrl}
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
