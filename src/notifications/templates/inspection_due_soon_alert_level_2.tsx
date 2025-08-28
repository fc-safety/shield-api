import { addDays } from 'date-fns';
import React from 'react';
import {
  InspectionReminderLayout,
  InspectionReminderTextLayout,
} from './components/inspection_reminder_layout';

type InspectionDueSoonAlertLevel2TemplateReactProps = Pick<
  React.ComponentProps<typeof InspectionReminderLayout>,
  'recipientFirstName' | 'assetsDueForInspectionBySite' | 'singleSite' | 'frontendUrl'
>;

export const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEMPLATE_TEST_PROPS: InspectionDueSoonAlertLevel2TemplateReactProps =
  {
    recipientFirstName: 'Jennifer',
    frontendUrl: 'http://localhost:5173',
    assetsDueForInspectionBySite: [
      {
        siteId: 'clz2b3c4d5e6f7g8h9i0j1k2',
        siteName: 'East Coast Warehouse',
        assetsDueForInspection: [
          {
            assetId: 'clz2b3c4d5e6f7g8h9i0j1k3',
            assetName: 'Server Room Fire Extinguisher',
            categoryId: 'clz2b3c4d5e6f7g8h9i0j1k4',
            categoryName: 'Fire Extinguisher',
            categoryIcon: 'fa-fire-extinguisher',
            categoryColor: 'rgb(239, 68, 68)',
            product: 'Amerex ABC Fire Extinguisher',
            dueDate: addDays(new Date(), 9),
          },
          {
            assetId: 'clz2b3c4d5e6f7g8h9i0j1k5',
            assetName: 'Electrical Panel First Aid Cabinet',
            categoryId: 'clz2b3c4d5e6f7g8h9i0j1k6',
            categoryName: 'First aid cabinet',
            categoryIcon: 'fa-suitcase-medical',
            categoryColor: 'rgb(34, 197, 94)',
            product: 'Industrial First Aid Cabinet',
            dueDate: addDays(new Date(), 8),
          },
          {
            assetId: 'clz2b3c4d5e6f7g8h9i0j1k7',
            assetName: 'Paint Booth AED',
            categoryId: 'clz2b3c4d5e6f7g8h9i0j1k8',
            categoryName: 'AED',
            categoryIcon: 'fa-heart-pulse',
            categoryColor: 'rgb(236, 72, 153)',
            product: 'Philips HeartStart FRx',
            dueDate: addDays(new Date(), 10),
          },
          {
            assetId: 'clz2b3c4d5e6f7g8h9i0j1k9',
            assetName: 'Loading Bay Eye Wash Station',
            categoryId: 'clz2b3c4d5e6f7g8h9i0j1l0',
            categoryName: 'Eye wash station',
            categoryIcon: 'fa-eye',
            categoryColor: 'rgb(6, 182, 212)',
            product: 'Bradley S19-921 Eyewash Station',
            dueDate: addDays(new Date(), 9),
          },
        ],
      },
    ],
  };

const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE =
  'The following assets are due very soon for inspection and have not yet been inspected:';
const INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE =
  'Please ensure that these assets are inspected ASAP, otherwise an alert will be escalated to your management team.';

function InspectionDueSoonAlertLevel2TemplateText({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel2TemplateReactProps) {
  return InspectionReminderTextLayout({
    recipientFirstName,
    assetsDueForInspectionBySite: assetsDueForInspection,
    openingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE,
    closingMessage: INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE,
    frontendUrl,
  });
}

export default function InspectionDueSoonAlertLevel2TemplateReact({
  recipientFirstName,
  assetsDueForInspectionBySite: assetsDueForInspection,
  frontendUrl,
}: InspectionDueSoonAlertLevel2TemplateReactProps): React.ReactElement {
  return (
    <InspectionReminderLayout
      recipientFirstName={recipientFirstName}
      assetsDueForInspectionBySite={assetsDueForInspection}
      openingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_OPENING_MESSAGE}
      closingMessage={INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEXT_CLOSING_MESSAGE}
      urgency="very_soon"
      frontendUrl={frontendUrl}
    />
  );
}

InspectionDueSoonAlertLevel2TemplateReact.PreviewProps = {
  ...INSPECTION_DUE_SOON_ALERT_LEVEL_2_TEMPLATE_TEST_PROPS,
};

InspectionDueSoonAlertLevel2TemplateReact.Subject = 'Inspections Due Soon';

InspectionDueSoonAlertLevel2TemplateReact.Text =
  InspectionDueSoonAlertLevel2TemplateText;
