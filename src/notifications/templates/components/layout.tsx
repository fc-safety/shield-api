import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Tailwind,
} from '@react-email/components';
import React from 'react';

export function Layout({
  preview,
  children,
}: React.PropsWithChildren<{ preview?: string }>) {
  return (
    <Html lang="en">
      <Head />
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: '#22c55e',
                'brand-foreground': '#fff',
              },
            },
          },
        }}
      >
        <Body className="bg-gray-100 py-8 font-sans">
          {preview && <Preview>{preview}</Preview>}
          <Container className="bg-white mx-auto max-w-xl rounded-lg">
            <Section className="flex justify-center items-center p-6">
              <Img
                width={150}
                src={'https://content.fc-safety.com/fc-safety-banner-logo.png'}
              />
            </Section>
            <Hr />
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
