import React from 'react';
import { Block } from './components/block';
import { Layout } from './components/layout';
import { Paragraph } from './components/paragraph';

export function TestTemplateText(): string {
  return `
  Hi,

  This is a test email from the Shield system. You can safely disregard this email.

  If you have any questions, please contact support@fc-safety.com.

  Regards,

  The FC Safety Team
  `;
}

export function TestTemplateReact(): React.ReactElement {
  return (
    <Layout preview="This is a test email from Shield">
      <Block>
        <Paragraph>Hi,</Paragraph>
        <Paragraph>
          This is a test email from the Shield system. You can safely disregard
          this email.
        </Paragraph>
        <Paragraph>
          If you have any questions, please contact support@fc-safety.com.
        </Paragraph>
        <Paragraph>Regards,</Paragraph>
        <Paragraph>The FC Safety Team</Paragraph>
      </Block>
    </Layout>
  );
}
