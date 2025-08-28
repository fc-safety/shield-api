import { Column, Row } from '@react-email/components';
import React from 'react';
import { Prisma } from 'src/generated/prisma/client';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { cn } from './utils/tailwind';

export interface TeamInspectionReminderTemplateProps {
  firstName: string;
  requestorName: string;
  asset: Prisma.AssetGetPayload<{
    select: {
      id: true;
      name: true;
      location: true;
      placement: true;
      site: {
        select: {
          id: true;
          name: true;
        };
      };
      tag: {
        select: {
          id: true;
          serialNumber: true;
        };
      };
    };
  }>;
}

export const TEAM_INSPECTION_REMINDER_TEMPLATE_TEST_PROPS: TeamInspectionReminderTemplateProps =
  {
    firstName: 'Jessica',
    requestorName: 'David Martinez',
    asset: {
      name: 'Reception Area AED Unit',
      id: 'asset-aed-reception-001',
      tag: {
        id: 'tag-aed-rec-001',
        serialNumber: 'AED-2024-REC-001',
      },
      location: 'Main Building - First Floor',
      placement: 'Reception Area - Near Security Desk',
      site: {
        name: 'North Regional Office',
        id: 'site-north-office',
      },
    },
  };

export function TeamInspectionReminderTemplateSms(
  props: TeamInspectionReminderTemplateProps,
): string {
  return `[FC Safety Shield] ${props.requestorName} requested we remind you that the following asset may be due soon for inspection:
  ---
  ${props.asset.name} ${props.asset.tag ? `(${props.asset.tag.serialNumber})` : ''}
  ${props.asset.site.name} - ${props.asset.location}, ${props.asset.placement}`.replace(
    /(\s*\n\s*)+/g,
    '\n',
  );
}

function TeamInspectionReminderTemplateText(
  props: TeamInspectionReminderTemplateProps,
): string {
  return `
  Hi ${props.firstName},

  ${props.requestorName} has requested that we remind you that the following asset may be due soon for inspection:

  Name: ${props.asset.name}
  Site: ${props.asset.site.name}
  Location: ${props.asset.location}
  Placement: ${props.asset.placement}
  Tag Serial No.: ${props.asset.tag?.serialNumber ?? '-'}

  Regards,

  The FC Safety Team
  `;
}

export default function TeamInspectionReminderTemplateReact(
  props: TeamInspectionReminderTemplateProps,
): React.ReactElement {
  return (
    <Layout preview="This is a test email from Shield">
      <Block>
        <Paragraph>Hi {props.firstName},</Paragraph>
        <Paragraph>
          {props.requestorName} has requested that we remind you that the
          following asset may be due soon for inspection:
        </Paragraph>
        {[
          {
            name: 'Name',
            value: props.asset.name,
            bold: true,
          },
          {
            name: 'Site',
            value: props.asset.site.name,
          },
          {
            name: 'Location',
            value: props.asset.location,
          },
          {
            name: 'Placement',
            value: props.asset.placement,
          },
          {
            name: 'Tag Serial No.',
            value: props.asset.tag?.serialNumber ?? <>&mdash;</>,
          },
        ].map((item) => (
          <Row key={item.name}>
            <Column className={cn('w-1/3 text-sm', item.bold && 'font-bold')}>
              {item.name}
            </Column>
            <Column className={cn('w-2/3 text-sm', item.bold && 'font-bold')}>
              {item.value}
            </Column>
          </Row>
        ))}
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

TeamInspectionReminderTemplateReact.Subject = 'Team Inspection Reminder';
TeamInspectionReminderTemplateReact.Text = TeamInspectionReminderTemplateText;

TeamInspectionReminderTemplateReact.PreviewProps = {
  ...TEAM_INSPECTION_REMINDER_TEMPLATE_TEST_PROPS,
};
