import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import React from 'react';

export default function TestTemplate(): React.ReactElement {
  return (
    <Html lang="en">
      <Head />
      <Body style={styles.main}>
        <Preview>This is a test email from Shield</Preview>
        <Container style={styles.container}>
          <Section style={styles.logo}>
            <Img
              width={114}
              src={'https://content.fc-safety.com/fc-safety-banner-logo.png'}
            />
          </Section>
          <Section style={styles.content}>
            <Text style={styles.paragraph}>Hi,</Text>
            <Text style={styles.paragraph}>
              This is a test email from the Shield system. You can safely
              disregard this email.
            </Text>
            <Text style={styles.paragraph}>
              If you have any questions, please contact support@fc-safety.com.
            </Text>
            <Text style={styles.paragraph}>Regards,</Text>
            <Text style={styles.paragraph}>The FC Safety Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const fontFamily = 'HelveticaNeue,Helvetica,Arial,sans-serif';
const styles = {
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily,
  },
  container: {
    maxWidth: '580px',
    margin: '30px auto',
    backgroundColor: '#ffffff',
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    alingItems: 'center',
    padding: 30,
  },
  content: {
    padding: '5px 20px 10px 20px',
  },
  paragraph: {
    lineHeight: 1.5,
    fontSize: 14,
  },
};
