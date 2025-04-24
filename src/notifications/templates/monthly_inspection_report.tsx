import { Column, Heading, Row } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';

interface MonthlyInspectionReportProps {
  recipientFirstName: string;
  singleSite?: boolean;
  clientName: string;
  reportRowsBySite: {
    siteName: string;
    reportRows: {
      categoryName: string;
      // TODO: Icons aren't very easy to use in emails. Normal CDNs don't work.
      categoryIcon?: string | null;
      categoryColor?: string | null;
      assetCount: number;
      pctCompliant: number;
      unresolvedAlertsCount: number;
    }[];
  }[];
}

const MONTHLY_INSPECTION_REPORT_PREVIEW_PROPS: MonthlyInspectionReportProps = {
  recipientFirstName: 'John',
  clientName: 'Safety Solutions',
  reportRowsBySite: [
    {
      siteName: 'Site 1',
      reportRows: [
        {
          categoryName: 'Fire Extinguishers',
          categoryIcon: 'fa-fire-extinguisher',
          categoryColor: 'rgb(253, 11, 55)',
          assetCount: 10,
          pctCompliant: 0.9,
          unresolvedAlertsCount: 1,
        },
        {
          categoryName: 'AED',
          categoryIcon: 'fa-heart-pulse',
          categoryColor: 'rgb(235, 0, 102)',
          assetCount: 15,
          pctCompliant: 0.4,
          unresolvedAlertsCount: 0,
        },
        {
          categoryName: 'Eye Wash Station',
          categoryIcon: 'fa-eye',
          categoryColor: 'rgb(12, 217, 170)',
          assetCount: 2,
          pctCompliant: 0.5,
          unresolvedAlertsCount: 0,
        },
      ],
    },
    {
      siteName: 'Site 2',
      reportRows: [
        {
          categoryName: 'Fire Extinguishers',
          categoryIcon: 'fa-fire-extinguisher',
          categoryColor: 'rgb(253, 11, 55)',
          assetCount: 10,
          pctCompliant: 0.8,
          unresolvedAlertsCount: 0,
        },
        {
          categoryName: 'AED',
          categoryIcon: 'fa-heart-pulse',
          categoryColor: 'rgb(235, 0, 102)',
          assetCount: 15,
          pctCompliant: 1,
          unresolvedAlertsCount: 3,
        },
      ],
    },
  ],
};

function MonthlyInspectionReportTemplateText({
  recipientFirstName,
  clientName,
  reportRowsBySite,
  singleSite,
}: MonthlyInspectionReportProps) {
  return `
  Monthly Compliance Report for ${clientName}

  Hi ${recipientFirstName},

  Please review the following report of site copmliance grouped by asset
  category.

  ${reportRowsBySite
    .map(
      (site) =>
        `${singleSite ? '' : `* ${site.siteName}`}
        Category | # Assets | % Compliant | # Unresolved Alerts
        ${site.reportRows
          .map(
            (row) =>
              `${row.categoryName} | ${row.assetCount} | ${Math.round(row.pctCompliant * 100)}% | ${row.unresolvedAlertsCount}`,
          )
          .join('\n')}`,
    )
    .join('\n\n')}

  Regards,
  Shield Team
  FC Safety
  `;
}

export default function MonthlyInspectionReportTemplateReact({
  recipientFirstName,
  clientName,
  reportRowsBySite,
  singleSite,
}: MonthlyInspectionReportProps): React.ReactElement {
  return (
    <Layout>
      <Block>
        <Heading className="text-lg">
          Monthly Compliance Report for {clientName}
        </Heading>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>
          Please review the following report of site copmliance grouped by asset
          category.
        </Paragraph>
      </Block>
      {reportRowsBySite.map((site) => (
        <Block key={site.siteName}>
          {!singleSite && (
            <Paragraph className="text-sm font-semibold p-0 m-0 pb-2">
              {site.siteName}
            </Paragraph>
          )}
          <Row className="text-sm font-semibold">
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              Category
            </Column>
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              # Assets
            </Column>
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              % Compliant
            </Column>
            <Column align="left" className="h-10 w-1/4 bg-gray-200 px-2">
              # Unresolved Alerts
            </Column>
          </Row>
          {site.reportRows
            .slice()
            .sort((a, b) => b.pctCompliant - a.pctCompliant)
            .map((row) => (
              <Row key={row.categoryName} className="text-sm">
                <Column align="left" className="h-10 w-1/4 bg-gray-50 px-2">
                  {row.categoryColor && (
                    <div
                      className="size-3 rounded-sm inline-block mr-1"
                      style={{ backgroundColor: row.categoryColor }}
                    />
                  )}
                  {row.categoryName}
                </Column>
                <Column align="left" className="h-10 w-1/4 bg-gray-50 px-2">
                  {row.assetCount}
                </Column>
                <Column align="left" className="h-10 w-1/4 bg-gray-50 px-2">
                  {Math.round(row.pctCompliant * 100)}%
                </Column>
                <Column align="left" className="h-10 w-1/4 bg-gray-50 px-2">
                  {row.unresolvedAlertsCount}
                </Column>
              </Row>
            ))}
        </Block>
      ))}
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

MonthlyInspectionReportTemplateReact.PreviewProps = {
  ...MONTHLY_INSPECTION_REPORT_PREVIEW_PROPS,
};

MonthlyInspectionReportTemplateReact.Subject = 'Monthly Inspection Report';

MonthlyInspectionReportTemplateReact.Text = MonthlyInspectionReportTemplateText;
