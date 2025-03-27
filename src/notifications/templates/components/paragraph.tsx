import { Text } from '@react-email/components';
import React from 'react';
import { cn } from '../utils/tailwind';

export function Paragraph({
  children,
  className,
}: React.PropsWithChildren & {
  className?: string;
}) {
  return <Text className={cn('text-sm', className)}>{children}</Text>;
}
