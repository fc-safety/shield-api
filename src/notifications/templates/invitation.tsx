import { Button, Heading, Hr, Section } from '@react-email/components';
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
  inviteeEmail: string;
  inviteUrl: string;
  expiresOn: string;
}

export default function InvitationTemplateReact({
  clientName,
  siteName,
  roleName,
  inviterFirstName,
  inviterLastName,
  inviteeEmail,
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
      preview={`${inviterFirstName} ${inviterLastName} invited you to join ${clientName} on the FC Safety Shield`}
    >
      <Block>
        <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px] text-center">
          You&apos;ve been invited to join {clientName} on the FC Safety Shield
        </Heading>
        <Paragraph>Hi there,</Paragraph>
        <Paragraph>
          {inviterFirstName} {inviterLastName} has invited you to join{' '}
          <strong>{clientName}</strong> on the FC Safety Shield. Here are your
          invitation details:
        </Paragraph>
        <Paragraph>
          <strong>Organization:</strong> {clientName}
          <br />
          <strong>Site:</strong> {siteName}
          <br />
          <strong>Role:</strong> {roleName}
        </Paragraph>
      </Block>
      <Hr />
      <Block>
        <Paragraph>
          To accept this invitation, click the button below. You will need to
          create an account or sign in if you already have one.
        </Paragraph>
      </Block>
      <Block>
        <Section className="bg-amber-50 border border-amber-200 rounded-md px-4 py-1">
          <Paragraph className="text-sm font-bold text-amber-900">
            Please use this email address to create your account or sign in:
          </Paragraph>
          <Paragraph className="text-base font-bold text-center text-amber-950">
            {inviteeEmail}
          </Paragraph>
          <Paragraph className="text-xs text-amber-800">
            This invitation is tied to this email address and cannot be accepted
            with a different one.
          </Paragraph>
        </Section>
      </Block>
      <Block className="text-center">
        <Button
          className="bg-brand text-brand-foreground text-sm px-5 py-3 rounded-md font-bold"
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
          Regards,
          <br />
          Shield Team
          <br />
          FC Safety
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
  inviteeEmail: 'john.doe@example.com',
  inviteUrl: 'https://shield.fc-safety.com/accept-invite/abc123xyz456',
  expiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

InvitationTemplateReact.Subject = ({ clientName }: InvitationTemplateProps) =>
  `You've been invited to join ${clientName} on the FC Safety Shield`;

InvitationTemplateReact.Text = ({
  clientName,
  siteName,
  roleName,
  inviterFirstName,
  inviterLastName,
  inviteeEmail,
  inviteUrl,
  expiresOn,
}: InvitationTemplateProps) => {
  const formattedExpiry = new Date(expiresOn).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
  You've been invited to join ${clientName} on the FC Safety Shield

  Hi there,

  ${inviterFirstName} ${inviterLastName} has invited you to join ${clientName} on the FC Safety Shield. Here are your invitation details:

  Organization: ${clientName}
  Site: ${siteName}
  Role: ${roleName}

  ---

  To accept this invitation, click the link below. You will need to create an account or sign in if you already have one.

  Please use this email address to create your account or sign in:
  ${inviteeEmail}

  This invitation is tied to this email address and cannot be accepted with a different one.

  Accept your invitation: ${inviteUrl}

  This invitation expires on ${formattedExpiry}.

  Regards,
  Shield Team
  FC Safety
`;
};
