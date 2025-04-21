import { Button, Heading, Hr } from '@react-email/components';
import { format } from 'date-fns';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { buildTextTable } from './utils/text';
import { getAssetsUrl } from './utils/urls';

// Types for our data structure
interface ConsumableItem {
  siteName: string;
  item: string;
  assetName: string;
  category: string;
  categoryColor?: string | null;
  expiryDate: string;
}

interface ConsumablesData {
  thirtyDays: ConsumableItem[];
  sixtyDays: ConsumableItem[];
  ninetyDays: ConsumableItem[];
}

interface MonthlyConsumableReportProps {
  recipientFirstName: string;
  clientName: string;
  data: ConsumablesData;
  frontendUrl: string;
}

function MonthlyConsumableReportText({
  recipientFirstName,
  clientName,
  data,
}: MonthlyConsumableReportProps) {
  return `
  Monthly Consumables Report for ${clientName}

  Hi ${recipientFirstName},

  Please review the following report of safety consumables that are
  expiring within the next 30, 60, and 90 days.

  ${ExpirationText({
    title: 'Expiring Within 30 Days - URGENT',
    items: data.thirtyDays,
  })}

  ${ExpirationText({
    title: 'Expiring Within 60 Days',
    items: data.sixtyDays,
  })}

  ${ExpirationText({
    title: 'Expiring Within 90 Days',
    items: data.ninetyDays,
  })}

  Please take immediate action to replace supplies expiring within 30
  days. For all other items, please plan replacements accordingly to
  ensure continuous safety compliance.

  Regards,
  Shield Team
  FC Safety
  `;
}

export default function MonthlyConsumableReportTemplateReact({
  recipientFirstName,
  clientName,
  data,
  frontendUrl,
}: MonthlyConsumableReportProps): React.ReactElement {
  // Color schemes for different sections
  const colorSchemes = {
    thirty: {
      title: 'text-red-600',
      headerBg: 'bg-red-50',
      headerText: 'text-red-700',
      headerBorder: 'border-red-200',
      dateText: 'text-red-600',
    },
    sixty: {
      title: 'text-yellow-600',
      headerBg: 'bg-yellow-50',
      headerText: 'text-yellow-700',
      headerBorder: 'border-yellow-200',
      dateText: 'text-yellow-600',
    },
    ninety: {
      title: 'text-blue-600',
      headerBg: 'bg-blue-50',
      headerText: 'text-blue-700',
      headerBorder: 'border-blue-200',
      dateText: 'text-blue-600',
    },
  };

  return (
    <Layout preview="Safety Consumables Expiration Report - Action Required">
      <Block>
        <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px]">
          Monthly Consumables Report for {clientName}
        </Heading>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>
          Please review the following report of consumable supplies that are
          expiring within the next 30, 60, and 90 days.
        </Paragraph>
      </Block>

      <ExpirationBlock
        title="Expiring Within 30 Days - URGENT"
        items={data.thirtyDays}
        colorScheme={colorSchemes.thirty}
      />

      <ExpirationBlock
        title="Expiring Within 60 Days"
        items={data.sixtyDays}
        colorScheme={colorSchemes.sixty}
      />

      <ExpirationBlock
        title="Expiring Within 90 Days"
        items={data.ninetyDays}
        colorScheme={colorSchemes.ninety}
      />

      <Hr className="border-gray-200 my-[24px]" />

      <Block className="text-center">
        <Paragraph>
          Please take immediate action to replace supplies expiring within 30
          days. For all other items, please plan replacements accordingly to
          ensure continuous safety compliance.
        </Paragraph>
        <Button
          className="bg-brand text-brand-foreground text-sm px-4 py-2 rounded-md"
          href={getAssetsUrl(frontendUrl)}
        >
          View Assets
        </Button>
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

const ExpirationText = ({
  title,
  items,
}: {
  title: string;
  items: ConsumableItem[];
}) => {
  if (items.length < 1) {
    return '';
  }

  return `
  \r⚠️ ${title}

  \r${buildTextTable({
    headers: [
      { key: 'siteName', label: 'Site' },
      { key: 'item', label: 'Item' },
      { key: 'assetName', label: 'Asset Name' },
      { key: 'category', label: 'Category' },
      { key: 'expiryDate', label: 'Expires' },
    ],
    data: items,
    width: 80,
  })}
  `;
};

const ExpirationBlock = ({
  title,
  items,
  colorScheme,
}: {
  title: string;
  items: ConsumableItem[];
  colorScheme: {
    title: string;
    headerBg: string;
    headerText: string;
    headerBorder: string;
    dateText: string;
  };
}) => {
  if (!items || items.length === 0) return null;

  return (
    <Block>
      <Heading
        className={`text-[16px] font-bold ${colorScheme.title} mb-[12px]`}
      >
        ⚠️ {title}
      </Heading>

      <table className="border-collapse w-full mb-[16px]">
        <thead>
          <tr>
            <th
              className={`${colorScheme.headerBg} text-left py-[8px] px-[8px] text-[14px] font-bold ${colorScheme.headerText} border ${colorScheme.headerBorder}`}
            >
              Site
            </th>
            <th
              className={`${colorScheme.headerBg} text-left py-[8px] px-[8px] text-[14px] font-bold ${colorScheme.headerText} border ${colorScheme.headerBorder}`}
            >
              Item
            </th>
            <th
              className={`${colorScheme.headerBg} text-left py-[8px] px-[8px] text-[14px] font-bold ${colorScheme.headerText} border ${colorScheme.headerBorder}`}
            >
              Asset Name
            </th>
            <th
              className={`${colorScheme.headerBg} text-left py-[8px] px-[8px] text-[14px] font-bold ${colorScheme.headerText} border ${colorScheme.headerBorder}`}
            >
              Category
            </th>
            <th
              className={`${colorScheme.headerBg} text-left py-[8px] px-[8px] text-[14px] font-bold ${colorScheme.headerText} border ${colorScheme.headerBorder}`}
            >
              Expires
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="py-[6px] px-[8px] text-[13px] border border-gray-200">
                {item.siteName}
              </td>
              <td className="py-[6px] px-[8px] text-[13px] border border-gray-200">
                {item.item}
              </td>
              <td className="py-[6px] px-[8px] text-[13px] border border-gray-200">
                {item.assetName}
              </td>
              <td className="py-[6px] px-[8px] text-[13px] border border-gray-200">
                {item.categoryColor && (
                  <div
                    className="size-3 rounded-sm inline-block mr-1"
                    style={{ backgroundColor: item.categoryColor }}
                  />
                )}
                {item.category}
              </td>
              <td
                className={`py-[6px] px-[8px] text-[13px] border border-gray-200 font-bold ${colorScheme.dateText}`}
              >
                {format(item.expiryDate, 'PP')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Block>
  );
};

MonthlyConsumableReportTemplateReact.PreviewProps = {
  recipientFirstName: 'John',
  clientName: 'Safety Solutions',
  frontendUrl: 'http://localhost:5173',
  data: {
    thirtyDays: [
      {
        siteName: 'Main Office',
        item: 'AED Pads - Adult',
        assetName: 'AED-001-PAD',
        category: 'Medical',
        categoryColor: '#FF0000',
        expiryDate: '05/01/2025',
      },
      {
        siteName: 'Main Office',
        item: 'Fire Extinguisher - Kitchen',
        assetName: 'FE-K-103',
        category: 'Fire Safety',
        categoryColor: '#FF0000',
        expiryDate: '05/05/2025',
      },
    ],
    sixtyDays: [
      {
        siteName: 'Distribution Center',
        item: 'Fire Extinguisher - Loading Dock',
        assetName: 'FE-LD-208',
        category: 'Fire Safety',
        categoryColor: '#FF0000',
        expiryDate: '06/12/2025',
      },
    ],
    ninetyDays: [
      {
        siteName: 'Warehouse A',
        item: 'Fire Extinguisher - Office Area',
        assetName: 'FE-WA-OFC',
        category: 'Fire Safety',
        categoryColor: '#FF0000',
        expiryDate: '07/01/2025',
      },
    ],
  },
} satisfies MonthlyConsumableReportProps;

MonthlyConsumableReportTemplateReact.Subject = 'Monthly Consumables Report';

MonthlyConsumableReportTemplateReact.Text = MonthlyConsumableReportText;
