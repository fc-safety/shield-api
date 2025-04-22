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
  head,
}: React.PropsWithChildren<{ preview?: string; head?: React.ReactNode[] }>) {
  return (
    <Html lang="en">
      <Head>{head}</Head>
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
                src={
                  'https://content.fc-safety.com/fc_safety_logo_full_05x-light.png'
                }
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
