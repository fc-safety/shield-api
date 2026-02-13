import { Button, Heading } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';

interface InvitationTemplateProps {
  clientName: string;
  siteName: string;
  roleName: string;
  inviterFirstName: string;
  inviterLastName: string;
  inviteUrl: string;
  expiresOn: string;
}

export default function InvitationTemplateReact({
  clientName,
  siteName,
  roleName,
  inviterFirstName,
  inviterLastName,
  inviteUrl,
  expiresOn,
}: InvitationTemplateProps): React.ReactElement {
  const formattedExpiry = new Date(expiresOn).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Layout
      preview={`${inviterFirstName} ${inviterLastName} invited you to join ${clientName} on FC Safety Shield`}
    >
      <Block>
        <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px] text-center">
          You&apos;re invited to join {clientName}
        </Heading>
        <Paragraph>Hi there,</Paragraph>
        <Paragraph>
          {inviterFirstName} {inviterLastName} has invited you to join{' '}
          <strong>{clientName}</strong> on the FC Safety Shield. Here are your
          access details:
        </Paragraph>
        <Paragraph>
          <strong>Organization:</strong> {clientName}
          <br />
          <strong>Site:</strong> {siteName}
          <br />
          <strong>Role:</strong> {roleName}
        </Paragraph>
      </Block>
      <Block className="text-center">
        <Paragraph>
          Click below to accept your invitation and get started.
        </Paragraph>
        <Button
          className="bg-brand text-brand-foreground text-sm px-4 py-2 rounded-md"
          href={inviteUrl}
        >
          Accept Invitation
        </Button>
        <Paragraph className="text-xs text-gray-500 mt-[16px]">
          This invitation expires on {formattedExpiry}.
        </Paragraph>
      </Block>
      <Block>
        <Paragraph>
          Best,
          <br />
          The FC Safety Shield Team
        </Paragraph>
      </Block>
    </Layout>
  );
}

InvitationTemplateReact.PreviewProps = {
  clientName: 'Acme Corporation',
  siteName: 'Main Campus',
  roleName: 'Inspector',
  inviterFirstName: 'Jane',
  inviterLastName: 'Smith',
  inviteUrl: 'https://shield.fc-safety.com/accept-invite/abc123xyz456',
  expiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

InvitationTemplateReact.Subject = ({ clientName }: InvitationTemplateProps) =>
  `You're invited to join ${clientName} on FC Safety Shield`;

InvitationTemplateReact.Text = ({
  clientName,
  siteName,
  roleName,
  inviterFirstName,
  inviterLastName,
  inviteUrl,
  expiresOn,
}: InvitationTemplateProps) => {
  const formattedExpiry = new Date(expiresOn).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
  You're invited to join ${clientName}

  Hi there,

  ${inviterFirstName} ${inviterLastName} has invited you to join ${clientName} on the FC Safety Shield. Here are your access details:

  Organization: ${clientName}
  Site: ${siteName}
  Role: ${roleName}

  Accept your invitation: ${inviteUrl}

  This invitation expires on ${formattedExpiry}.

  Best,
  The FC Safety Shield Team
`;
};
