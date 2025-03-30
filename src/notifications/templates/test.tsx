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

export default function TestTemplateReact(): React.ReactElement {
  return (
    <Layout preview="This is a test email from Shield">
      <Block>
        <Paragraph>Hi,</Paragraph>
        <Paragraph>
          This is a test email from the Shield system. You can safely disregard
          this email.
        </Paragraph>
        <Paragraph>
          If you have any questions, please contact{' '}
          <a href="mailto:support@fc-safety.com">support@fc-safety.com</a>.
        </Paragraph>
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
