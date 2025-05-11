import {
  Button,
  Column,
  Heading,
  Link,
  Row,
  Section,
} from '@react-email/components';
import { format, isValid, parseISO } from 'date-fns';
import React from 'react';
import { AlertLevel, Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { cn } from './utils/tailwind';
import { buildFrontendUrl } from './utils/urls';

interface TriggeredAlert {
  id: string;
  createdOn: Date;
  alertLevel: AlertLevel;
  message: string;
  questionPrompt: string;
  questionResponseValue: Prisma.JsonValue;
  inspectionImageUrl: string | null;
}

interface AlertAsset {
  id: string;
  name: string;
  serialNumber: string;
  location: string;
  placement: string;
  categoryColor: string | null;
  categoryName: string;
}

interface InspectionAlertTriggeredTemplateProps {
  recipientFirstName: string;
  siteName: string;
  alert: TriggeredAlert;
  asset: AlertAsset;
  inspectorName: string;
  frontendUrl: string;
}

export default function InspectionAlertTriggeredTemplateReact({
  recipientFirstName,
  siteName,
  alert,
  asset,
  inspectorName,
  frontendUrl,
}: InspectionAlertTriggeredTemplateProps): React.ReactElement {
  const rowData = [
    { label: 'Date', value: format(alert.createdOn, 'PPpp') },
    {
      label: 'Level',
      value: (
        <div
          className={cn(
            'text-sm px-2 py-1 rounded-md border w-max capitalize font-bold',
            alert.alertLevel === AlertLevel.URGENT && 'bg-red-100 text-red-800',
            alert.alertLevel === AlertLevel.INFO &&
              'bg-yellow-100 text-yellow-800',
          )}
        >
          {alert.alertLevel.toLowerCase()}
        </div>
      ),
    },
    {
      label: 'Asset',
      value: (
        <Section className="space-x-1">
          {asset.name} – {asset.categoryName}
          {asset.categoryColor && (
            <div
              className="size-3 rounded-sm inline-block ml-0.5"
              style={{ backgroundColor: asset.categoryColor }}
            />
          )}
        </Section>
      ),
    },
    {
      label: 'Asset Location',
      value: (
        <>
          {asset.location} – {asset.placement}
        </>
      ),
    },
    { label: 'Inspector', value: inspectorName },
    {
      label: 'Reason',
      value: alert.message.replace(/^./, (c) => c.toUpperCase()),
    },
    {
      label: 'Question',
      value: alert.questionPrompt,
    },
    {
      label: 'Answer',
      value: !isNil(alert.questionResponseValue) ? (
        <DisplayInspectionValue value={alert.questionResponseValue} />
      ) : (
        <>&mdash;</>
      ),
    },
    {
      label: 'Inspection Image',
      value: alert.inspectionImageUrl ? (
        <PreviewInspectionImages urls={[alert.inspectionImageUrl]} />
      ) : (
        <>&mdash;</>
      ),
    },
  ];

  return (
    <Layout preview="Inspection Alert Triggered">
      <Block>
        <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px]">
          Inspection Alert Triggered
        </Heading>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>
          An inspection alert has been triggered at the site "{siteName}
          ".
        </Paragraph>
        <Heading className="text-sm">Here are the details:</Heading>
        {rowData.map(({ label, value }) => (
          <Row key={label} className="text-sm h-8">
            <Column
              align="left"
              className="w-1/4 bg-gray-100 px-2 py-1 font-bold"
            >
              {label}
            </Column>
            <Column align="left" className="w-3/4 px-2 py-1">
              {value}
            </Column>
          </Row>
        ))}
      </Block>
      <Block className="text-center">
        <Paragraph>
          To see more details, log in to the Shield app and view alerts for this
          asset.
        </Paragraph>
        <Button
          className="bg-brand text-brand-foreground text-sm px-4 py-2 rounded-md"
          href={buildFrontendUrl(`/assets/${asset.id}?tab=alerts`, frontendUrl)}
        >
          Go to FC Safety Shield
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

InspectionAlertTriggeredTemplateReact.Text = ({
  recipientFirstName,
  siteName,
  alert,
  asset,
  inspectorName,
  frontendUrl,
}: InspectionAlertTriggeredTemplateProps) => {
  return `
    Hi ${recipientFirstName},

    An inspection alert has been triggered at the site "${siteName}".

    Here are the details:

    Date: ${format(alert.createdOn, 'PPpp')}
    Level: ${alert.alertLevel.toLowerCase()}
    Asset: ${asset.name} – ${asset.categoryName}
    Asset Location: ${asset.location} – ${asset.placement}
    Inspector: ${inspectorName}
    Reason: ${alert.message.replace(/^./, (c) => c.toUpperCase())}
    Question: ${alert.questionPrompt}
    Answer: ${!isNil(alert.questionResponseValue) ? DisplayInspectionValue({ value: alert.questionResponseValue, asText: true }) : '–'}
    Inspection Image: ${alert.inspectionImageUrl ? `[View](${alert.inspectionImageUrl})` : '–'}

    To see more details, log in to the Shield app and view alerts for this
    asset.

    ${buildFrontendUrl(`/assets/${asset.id}?tab=alerts`, frontendUrl)}
    
    Regards,
    
    Shield Team
    FC Safety
  `;
};

InspectionAlertTriggeredTemplateReact.Subject = 'Inspection Alert Triggered';

InspectionAlertTriggeredTemplateReact.PreviewProps = {
  recipientFirstName: 'John',
  siteName: 'Site 1',
  alert: {
    id: '1',
    createdOn: new Date(),
    alertLevel: AlertLevel.INFO,
    message: 'This is a test alert',
    questionPrompt: 'Is the check indicator light green?',
    questionResponseValue: 'No',
    inspectionImageUrl: null,
  },
  asset: {
    id: '1',
    name: 'Asset 1',
    serialNumber: '1234567890',
    location: 'Location 1',
    placement: 'Placement 1',
    categoryColor: '#FF0000',
    categoryName: 'AED',
  },
  inspectorName: 'John Doe',
  frontendUrl: 'https://shield.stg.fc-safety.com',
} satisfies InspectionAlertTriggeredTemplateProps;

export interface ResponseValueImage {
  urls: string[];
}

function PreviewInspectionImages({
  urls,
  asText,
}: {
  urls: string[];
  asText?: boolean;
}) {
  if (asText) {
    return urls.map((url, idx) => `[Preview #${idx + 1}] ${url}`).join(', ');
  }

  return (
    <div className="space-y-1">
      {urls.map((url, idx) => (
        <Link key={url} href={url} className="block text-sm">
          Preview #{idx + 1}
        </Link>
      ))}
    </div>
  );
}

function DisplayInspectionValue({
  value,
  asText,
}: {
  value: Prisma.JsonValue;
  asText?: boolean;
}) {
  return isImageValue(value) ? (
    <PreviewInspectionImages urls={value.urls} asText={asText} />
  ) : isDateValue(value) ? (
    format(parseISO(value), 'PP')
  ) : isNumberValue(value) ? (
    value
  ) : (
    String(value)
  );
}

const responseValueImageSchema = z.object({
  urls: z.array(z.string()),
}) satisfies z.Schema<ResponseValueImage>;

const isImageValue = (value: unknown): value is ResponseValueImage => {
  return responseValueImageSchema.safeParse(value).success;
};

const isDateValue = (value: unknown): value is string => {
  return isStringValue(value) && isValid(parseISO(value));
};

const isNumberValue = (value: unknown): value is number => {
  return typeof value === 'number';
};

const isStringValue = (value: unknown): value is string => {
  return typeof value === 'string';
};

const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;
