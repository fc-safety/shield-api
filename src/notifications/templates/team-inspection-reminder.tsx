import { Prisma } from '@prisma/client';
import { Column, Row } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { cn } from './utils/tailwind';

export interface TeamInspectionReminderTemplateProps {
  firstName: string;
  requestorName: string;
  asset: Prisma.AssetGetPayload<{
    include: {
      tag: true;
      site: true;
    };
  }>;
}

export const TEAM_INSPECTION_REMINDER_TEMPLATE_TEST_PROPS: TeamInspectionReminderTemplateProps =
  {
    firstName: 'Bill',
    requestorName: 'John Doe',
    asset: {
      name: 'Asset 1',
      id: '1',
      createdOn: new Date(),
      modifiedOn: new Date(),
      setupOn: new Date(),
      active: true,
      productId: '1',
      tagId: '1',
      tag: {
        id: '1',
        createdOn: new Date(),
        modifiedOn: new Date(),
        serialNumber: '1234567890',
        siteId: '1',
        clientId: '1',
        externalId: '1',
      },
      location: 'Location 1',
      placement: 'Placement 1',
      serialNumber: '1234567890',
      inspectionCycle: null,
      inspectionRouteId: '1',
      siteId: '1',
      site: {
        name: 'Site 1',
        id: '1',
        createdOn: new Date(),
        modifiedOn: new Date(),
        clientId: '1',
        externalId: '1',
        addressId: '1',
        phoneNumber: '1234567890',
        primary: true,
        parentSiteId: null,
      },
      clientId: '1',
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

export function TeamInspectionReminderTemplateText(
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

TeamInspectionReminderTemplateReact.PreviewProps = {
  ...TEAM_INSPECTION_REMINDER_TEMPLATE_TEST_PROPS,
};
