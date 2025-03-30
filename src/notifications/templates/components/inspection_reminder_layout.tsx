import { Column, Row } from '@react-email/components';
import { format } from 'date-fns';
import React from 'react';
import { cn } from '../utils/tailwind.js';
import { Block } from './block.js';
import { Layout } from './layout.js';
import { Paragraph } from './paragraph.js';

interface InspectionReminderLayoutProps {
  recipientFirstName: string;
  assetsDueForInspectionBySite: {
    siteName: string;
    assetsDueForInspection: {
      assetId: string;
      assetName: string;
      categoryName: string;
      // TODO: Icons aren't very easy to use in emails. Normal CDNs don't work.
      categoryIcon?: string | null;
      categoryColor?: string | null;
      product: string;
      dueDate: Date;
    }[];
  }[];
  singleSite?: boolean;
  urgency?: 'critical' | 'urgent' | 'very_soon' | 'soon' | 'normal';
  openingMessage: string;
  closingMessage: string;
}

export function InspectionReminderTextLayout({
  recipientFirstName,
  assetsDueForInspectionBySite,
  singleSite,
  openingMessage,
  closingMessage,
}: InspectionReminderLayoutProps) {
  return `
  Hi ${recipientFirstName},

  ${openingMessage}

  ${assetsDueForInspectionBySite
    .map(
      (site) =>
        `${singleSite ? '' : `* ${site.siteName}`}
        Asset Name | Category | Product | Due Date
        ${site.assetsDueForInspection
          .map(
            (item) =>
              `${item.assetName} | ${item.categoryName} | ${item.product} | ${format(item.dueDate, 'PP')}`,
          )
          .join('\n')}`,
    )
    .join('\n\n')}
  
  ${closingMessage}

  Thank you,
  Shield Team
  FC Safety
  `;
}
export function InspectionReminderLayout({
  recipientFirstName,
  assetsDueForInspectionBySite,
  singleSite,
  openingMessage,
  closingMessage,
  urgency,
}: InspectionReminderLayoutProps): React.ReactElement {
  return (
    <Layout>
      <Block>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>{openingMessage}</Paragraph>
      </Block>
      {assetsDueForInspectionBySite.map((site) => (
        <Block key={site.siteName}>
          {!singleSite && (
            <Paragraph className="text-sm font-semibold p-0 m-0 pb-2">
              {site.siteName}
            </Paragraph>
          )}
          <Row className="text-sm font-semibold">
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              Asset Name
            </Column>
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              Category
            </Column>
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              Product
            </Column>
            <Column align="right" className="h-10 w-1/4 bg-gray-200 px-2">
              Due Date
            </Column>
          </Row>
          {site.assetsDueForInspection.map((item) => (
            <Row key={item.assetId} className="text-sm">
              <Column align="left" className="h-8 w-1/4 bg-gray-50 px-2">
                {item.assetName}
              </Column>
              <Column align="left" className="h-8 w-1/4 bg-gray-50 px-2">
                {item.categoryColor && (
                  <div
                    className="size-3 rounded-sm inline-block mr-0.5"
                    style={{ backgroundColor: item.categoryColor }}
                  />
                )}
                {item.categoryName}
              </Column>
              <Column align="left" className="h-8 w-1/4 bg-gray-50 px-2">
                {item.product}
              </Column>
              <Column
                align="right"
                className={cn(
                  'h-8 w-1/4 bg-gray-50 px-2',
                  urgency === 'critical' && 'bg-red-500 text-red-950 font-bold',
                  urgency === 'urgent' &&
                    'bg-orange-500 text-orange-950 font-semibold',
                  urgency === 'very_soon' &&
                    'bg-amber-500 text-amber-950 font-semibold',
                  urgency === 'soon' && 'bg-yellow-400 text-yellow-950',
                )}
              >
                {format(item.dueDate, 'PP')}
              </Column>
            </Row>
          ))}
        </Block>
      ))}
      <Block>
        <Paragraph>{closingMessage}</Paragraph>
      </Block>
      <Block>
        <Paragraph>Regards,</Paragraph>
        <Paragraph>
          Shield Team
          <br />
          FC Safety
        </Paragraph>
      </Block>
    </Layout>
  );
}
