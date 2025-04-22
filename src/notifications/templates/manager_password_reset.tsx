import { Button, CodeInline, Heading } from '@react-email/components';
import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';
import { buildFrontendUrl } from './utils/urls';

interface ManagerPasswordResetTemplateProps {
  recipientFirstName: string;
  password: string;
  frontendUrl: string;
}

export default function ManagerPasswordResetTemplateReact({
  recipientFirstName,
  password,
  frontendUrl,
}: ManagerPasswordResetTemplateProps): React.ReactElement {
  return (
    <Layout preview={'Your FC Safety Shield password has been reset'}>
      <Block>
        <Heading className="text-[16px] font-bold text-gray-800 mt-[10px] mb-[20px] text-center">
          Your FC Safety Shield password has been reset by an administrator.
        </Heading>
        <Paragraph>Hi {recipientFirstName},</Paragraph>
        <Paragraph>
          An administrator has reset the password for your FC Safety Shield
          account. Any old password can no longer be used.
        </Paragraph>
        <Paragraph>Your new password is:</Paragraph>
        <CodeInline>{password}</CodeInline>
      </Block>
      <Block className="text-center">
        <Paragraph>
          You can now log into your FC Safety Shield account using this new
          password.
        </Paragraph>
        <Button
          className="bg-brand text-brand-foreground text-sm px-4 py-2 rounded-md"
          href={buildFrontendUrl('/', frontendUrl)}
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

ManagerPasswordResetTemplateReact.PreviewProps = {
  recipientFirstName: 'John',
  password: 'horse_battery_staple',
  frontendUrl: 'https://shield.fc-safety.com',
};

ManagerPasswordResetTemplateReact.Subject = 'Password Reset';

ManagerPasswordResetTemplateReact.Text = ({
  recipientFirstName,
  password,
  frontendUrl,
}: ManagerPasswordResetTemplateProps) => `
  Your FC Safety Shield password has been reset by an administrator.

  Hi ${recipientFirstName},

  Your new password is: ${password}.

  You can now log into your FC Safety Shield account using this new password.

  ${frontendUrl}

  Regards,
  Shield Team
  FC Safety
`;
