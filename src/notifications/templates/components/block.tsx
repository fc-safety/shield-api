import { Section } from '@react-email/components';
import React from 'react';
import { cn } from '../utils/tailwind';

export function Block({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Section>) {
  return (
    <Section className={cn('px-5 py-2', className)} {...props}>
      {children}
    </Section>
  );
}
