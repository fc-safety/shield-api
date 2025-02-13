import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateProductRequestItemSchema = z.object({
  productId: z.string(),
  quantity: z.coerce.number().gte(1),
});

export const CreateOrderRequestSchema = z.object({
  productRequestItems: z.object({
    createMany: z.object({
      data: z.array(CreateProductRequestItemSchema),
    }),
  }),
  asset: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.ProductRequestCreateInput>;

export class CreateOrderRequestDto extends createZodDto(
  CreateOrderRequestSchema,
) {}
