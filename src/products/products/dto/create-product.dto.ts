import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProductSchema = z.object({
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
    })
    .optional(),
  perishable: z.boolean().optional(),
  ansiMinimumRequired: z.boolean().optional(),
}) satisfies z.Schema<Prisma.ProductCreateInput>;

export class CreateProductDto extends createZodDto(CreateProductSchema) {}
