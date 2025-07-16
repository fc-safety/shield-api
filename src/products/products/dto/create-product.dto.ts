import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateProductSchema = z.object({
  legacyProductId: z.string().optional().nullable(),
  legacyConsumableId: z.string().optional().nullable(),
  active: z.boolean().optional(),
  manufacturer: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  type: z.enum(['PRIMARY', 'CONSUMABLE']),
  name: z.string(),
  description: z.string().optional(),
  sku: z.string().optional(),
  productUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  productCategory: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  parentProduct: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  quantity: z.number().optional(),
  price: z.number().optional(),
  ansiCategory: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
      disconnect: z.boolean(),
    })
    .partial()
    .optional(),
  perishable: z.boolean().optional(),
  ansiMinimumRequired: z.boolean().optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.ProductCreateInput>;

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
