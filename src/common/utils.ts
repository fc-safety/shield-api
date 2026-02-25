import { NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { Prisma } from 'src/generated/prisma/client';

export const as404OrThrow = (e: unknown) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    throw new NotFoundException();
  }
  throw e; // rethrow
};

const ACCESS_INTENTS = ['system', 'elevated', 'user'] as const;
export type AccessIntent = (typeof ACCESS_INTENTS)[number];

export const getAccessIntent = (req: Request): AccessIntent => {
  const intent = firstOf(req.headers['x-access-intent']) as
    | AccessIntent
    | undefined;

  // For backwards compatibility, check for deprecated x-view-context header.
  if (!intent) {
    const viewContext = firstOf(req.headers['x-view-context']);
    if (viewContext === 'admin') {
      return 'system';
    }
  }

  if (intent && ACCESS_INTENTS.includes(intent)) {
    return intent;
  }

  return 'user';
};

export const isNil = (value: unknown): value is null | undefined =>
  value === null || value === undefined;

export const groupBy = <T, K extends string>(
  array: T[],
  getKey: (item: T) => K,
): Record<K, T[]> => {
  return array.reduce(
    (acc, item) => {
      const key = getKey(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
};

export const firstOf = <T>(value: T | T[]): T => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};
