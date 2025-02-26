import { Text } from '@react-email/components';
import React from 'react';

export function Paragraph({ children }: React.PropsWithChildren) {
  return <Text className="text-sm">{children}</Text>;
}
