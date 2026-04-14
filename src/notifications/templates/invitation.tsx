import { Button, Heading, Hr, Section } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';

interface Assignment {
  // Omitted for client-wide (or higher) scope roles where the site is irrelevant.
  siteName?: string;
  roleName: string;
}

interface InvitationTemplateProps {
  clientName: string;
  siteName?: string;
  roleName?: string;
  assignments?: Assignment[];
  inviterFirstName: string;
  inviterLastName: string;
  inviteeEmail: string;
  inviteUrl: string;
  expiresOn: string;
}

function getAssignments(props: InvitationTemplateProps): Assignment[] {
  // Note: `siteName` is omitted for client-wide+ scope roles, so the legacy
  // fallback must trigger on `roleName` alone — not `siteName && roleName`.
  const raw =
    props.assignments && props.assignments.length > 0
      ? props.assignments
      : props.roleName
        ? [{ siteName: props.siteName, roleName: props.roleName }]
        : [];

  // Defensive dedupe — callers should already dedupe, but a duplicate slipping
  // through would render visibly broken in the email.
  const seen = new Set<string>();
  return raw.filter((a) => {
    const key = `${a.siteName}|${a.roleName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function InvitationTemplateReact(
  props: InvitationTemplateProps,
): React.ReactElement {
  const {
    clientName,
    inviterFirstName,
    inviterLastName,
    inviteeEmail,
    inviteUrl,
    expiresOn,
  } = props;

  const assignments = getAssignments(props);
  const isSingle = assignments.length === 1;

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
        {isSingle ? (
          <Paragraph>
            <strong>Organization:</strong> {clientName}
            {assignments[0].siteName ? (
              <>
                <br />
                <strong>Site:</strong> {assignments[0].siteName}
              </>
            ) : null}
            <br />
            <strong>Role:</strong> {assignments[0].roleName}
          </Paragraph>
        ) : (
          <>
            <Paragraph>
              <strong>Organization:</strong> {clientName}
            </Paragraph>
            <Paragraph>
              <strong>Assigned roles:</strong>
            </Paragraph>
            {assignments.map((a, i) => (
              <Paragraph key={i} className="ml-4 my-0">
                &bull; <strong>{a.roleName}</strong>
                {a.siteName ? <> at {a.siteName}</> : null}
              </Paragraph>
            ))}
          </>
        )}
      </Block>
      <Hr />
      <Block>
        <Paragraph>
          To accept this invitation, click the button below. You will need to
          create an account, or sign in if you already have one.
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

InvitationTemplateReact.MultiPreviewProps = {
  clientName: 'Acme Corporation',
  assignments: [
    { siteName: 'Main Campus', roleName: 'Inspector' },
    { siteName: 'Downtown Office', roleName: 'Manager' },
    { siteName: 'Warehouse B', roleName: 'Inspector' },
  ],
  inviterFirstName: 'Jane',
  inviterLastName: 'Smith',
  inviteeEmail: 'john.doe@example.com',
  inviteUrl: 'https://shield.fc-safety.com/accept-invite/abc123xyz456',
  expiresOn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

InvitationTemplateReact.Subject = ({ clientName }: InvitationTemplateProps) =>
  `You've been invited to join ${clientName} on the FC Safety Shield`;

InvitationTemplateReact.Text = (props: InvitationTemplateProps) => {
  const {
    clientName,
    inviterFirstName,
    inviterLastName,
    inviteeEmail,
    inviteUrl,
    expiresOn,
  } = props;
  const assignments = getAssignments(props);
  const isSingle = assignments.length === 1;

  const formattedExpiry = new Date(expiresOn).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const assignmentText = isSingle
    ? `  Organization: ${clientName}${
        assignments[0].siteName ? `\n  Site: ${assignments[0].siteName}` : ''
      }\n  Role: ${assignments[0].roleName}`
    : `  Organization: ${clientName}\n  Assigned roles:\n${assignments
        .map(
          (a) => `    - ${a.roleName}${a.siteName ? ` at ${a.siteName}` : ''}`,
        )
        .join('\n')}`;

  return `
  You've been invited to join ${clientName} on the FC Safety Shield

  Hi there,

  ${inviterFirstName} ${inviterLastName} has invited you to join ${clientName} on the FC Safety Shield. Here are your invitation details:

${assignmentText}

  ---

  To accept this invitation, click the link below. You will need to create an account, or sign in if you already have one.

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
