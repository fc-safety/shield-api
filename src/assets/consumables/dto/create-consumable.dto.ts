import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateConsumableSchema = z.object({
  legacyInventoryId: z.string().optional().nullable(),
  asset: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  product: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  expiresOn: z.string().datetime().optional(),
  quantity: z.number().optional(),
  site: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.ConsumableCreateInput>;

export class CreateConsumableDto extends createZodDto(CreateConsumableSchema) {}
