import { Column, Heading, Link, Row } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { FAIcon } from './components/fa-icon';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { getAssetsUrl } from './utils/urls';

interface MonthlyInspectionReportProps {
  recipientFirstName: string;
  singleSite?: boolean;
  clientName: string;
  frontendUrl: string;
  reportRowsBySite: {
    siteName: string;
    siteId: string;
    reportRows: {
      categoryId: string;
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
  frontendUrl: 'http://localhost:5173',
  reportRowsBySite: [
    {
      siteName: 'Research Laboratory Building',
      siteId: '123',
      reportRows: [
        {
          categoryId: '1',
          categoryName: 'Fire Extinguisher',
          categoryIcon: 'fa-fire-extinguisher',
          categoryColor: 'rgb(239, 68, 68)',
          assetCount: 10,
          pctCompliant: 0.9,
          unresolvedAlertsCount: 1,
        },
        {
          categoryId: '2',
          categoryName: 'AED',
          categoryIcon: 'fa-heart-pulse',
          categoryColor: 'rgb(236, 72, 153)',
          assetCount: 15,
          pctCompliant: 0.4,
          unresolvedAlertsCount: 0,
        },
        {
          categoryId: '3',
          categoryName: 'Eye wash station',
          categoryIcon: 'fa-eye',
          categoryColor: 'rgb(6, 182, 212)',
          assetCount: 2,
          pctCompliant: 0.5,
          unresolvedAlertsCount: 0,
        },
        {
          categoryId: '4',
          categoryName: 'First aid cabinet',
          categoryIcon: 'fa-suitcase-medical',
          categoryColor: 'rgb(34, 197, 94)',
          assetCount: 5,
          pctCompliant: 0.8,
          unresolvedAlertsCount: 1,
        },
      ],
    },
    {
      siteName: 'Photonics Data Center',
      siteId: '456',
      reportRows: [
        {
          categoryId: '1',
          categoryName: 'Fire Extinguisher',
          categoryIcon: 'fa-fire-extinguisher',
          categoryColor: 'rgb(239, 68, 68)',
          assetCount: 10,
          pctCompliant: 0.8,
          unresolvedAlertsCount: 0,
        },
        {
          categoryId: '2',
          categoryName: 'AED',
          categoryIcon: 'fa-heart-pulse',
          categoryColor: 'rgb(236, 72, 153)',
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

  Please review the following report of site compliance grouped by${singleSite ? '' : ' site and'} asset
  category.

  ${reportRowsBySite
    .map(
      (site) =>
        `${singleSite ? '' : `* Site: ${site.siteName}`}
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
  frontendUrl,
}: MonthlyInspectionReportProps): React.ReactElement {
  return (
    <Layout>
      <Block>
        <Heading className="text-lg">
          Monthly Compliance Report for {clientName}
        </Heading>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>
          Please review the following report of site compliance grouped by
          {singleSite ? '' : ' site and'} asset category.
        </Paragraph>
      </Block>
      {reportRowsBySite.map((site) => (
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
                    <FAIcon
                      name={row.categoryIcon ?? undefined}
                      color={row.categoryColor}
                      className="mr-1"
                    />
                  )}
                  <Link
                    href={getAssetsUrl(frontendUrl, {
                      query: {
                        siteId: site.siteId,
                        productCategoryId: row.categoryId,
                      },
                    })}
                  >
                    {row.categoryName}
                  </Link>
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

MonthlyInspectionReportTemplateReact.Subject = 'Monthly Compliance Report';

MonthlyInspectionReportTemplateReact.Text = MonthlyInspectionReportTemplateText;
