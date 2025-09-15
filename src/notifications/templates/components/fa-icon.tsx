import React from 'react';
import { cn } from '../utils/tailwind';

export function FAIcon({
  name,
  color,
  className,
}: {
  name?: string;
  color: string;
  className?: string;
}): React.ReactElement {
  if (!name) {
    return (
      <div
        className={cn(
          'size-3 rounded-sm inline-block align-text-bottom',
          className,
        )}
        style={{ backgroundColor: color }}
      />
    );
  }

  return (
    <img
      src={`https://content.fc-safety.com/icon/${name.replace(/^fa-/, '')}?color=${encodeURIComponent(color)}&size=32&format=png`}
      alt="✅"
      className={cn('size-4 text-xs inline-block align-text-bottom', className)}
    />
  );
}
