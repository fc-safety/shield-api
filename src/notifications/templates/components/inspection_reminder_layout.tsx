import { Column, Heading, Link, Row } from '@react-email/components';
import { format } from 'date-fns';
import React from 'react';
import { cn } from '../utils/tailwind.js';
import { getAssetsUrl } from '../utils/urls.js';
import { Block } from './block.js';
import { FAIcon } from './fa-icon.js';
import { Layout } from './layout.js';
import { Paragraph } from './paragraph.js';

interface InspectionReminderLayoutProps {
  recipientFirstName: string;
  assetsDueForInspectionBySite: {
    siteId: string;
    siteName: string;
    assetsDueForInspection: {
      assetId: string;
      assetName: string;
      categoryId: string;
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
  frontendUrl: string;
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
  frontendUrl,
}: InspectionReminderLayoutProps): React.ReactElement {
  return (
    <Layout>
      <Block>
        {urgency !== undefined && urgency !== 'normal' && (
          <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px]">
            Reminder: Inspections Due Soon
          </Heading>
        )}
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>{openingMessage}</Paragraph>
      </Block>
      {assetsDueForInspectionBySite.map((site) => (
        <Block key={site.siteName}>
          {!singleSite && (
            <Paragraph className="text-sm font-semibold p-0 m-0 pb-2">
              Site:{' '}
              <Link
                href={getAssetsUrl(frontendUrl, {
                  query: {
                    siteId: site.siteId,
                  },
                })}
              >
                {site.siteName}
              </Link>
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
                <Link href={getAssetsUrl(frontendUrl, item.assetId)}>
                  {item.assetName}
                </Link>
              </Column>
              <Column align="left" className="h-8 w-1/4 bg-gray-50 px-2">
                {item.categoryColor && (
                  <FAIcon
                    name={item.categoryIcon ?? undefined}
                    color={item.categoryColor}
                    className="mr-1"
                  />
                )}
                <Link
                  href={getAssetsUrl(frontendUrl, {
                    query: {
                      siteId: site.siteId,
                      productCategoryId: item.categoryId,
                    },
                  })}
                >
                  {item.categoryName}
                </Link>
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
