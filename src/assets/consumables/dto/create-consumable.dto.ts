import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateConsumableSchema = z.object({
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
