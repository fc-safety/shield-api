import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateTagSchema = z.object({
  legacyTagId: z.string().optional().nullable(),
  externalId: z.string().optional(),
  serialNumber: z.string(),
  asset: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
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
}) satisfies z.Schema<Prisma.TagCreateInput>;

export class CreateTagDto extends createZodDto(CreateTagSchema) {}
