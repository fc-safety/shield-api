import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateTagSchema = z.object({
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
