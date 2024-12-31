import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const as404OrThrow = (e: unknown) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
    throw new NotFoundException();
  }
  throw e; // rethrow
};
