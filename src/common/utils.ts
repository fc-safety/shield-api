import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';

export const as404OrThrow = (e: unknown) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    throw new NotFoundException();
  }
  throw e; // rethrow
};

const VIEW_CONTEXTS = ['admin', 'user'] as const;
export type ViewContext = (typeof VIEW_CONTEXTS)[number];

export const getViewContext = (req: Request): ViewContext => {
  const view = req.headers['x-view-context'] as ViewContext;
  if (!VIEW_CONTEXTS.includes(view)) {
    return 'user';
  }
  return view;
};
