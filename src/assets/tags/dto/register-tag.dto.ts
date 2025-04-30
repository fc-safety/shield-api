import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const RegisterTagSchema = z.object({
  asset: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  site: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<
  Omit<Prisma.TagCreateInput, 'externalId' | 'serialNumber'>
>;

export class RegisterTagDto extends createZodDto(RegisterTagSchema) {}
