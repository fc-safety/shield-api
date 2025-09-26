import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import z from 'zod';
import { CreateProductCategorySchema } from './create-product-category.dto';

export class UpdateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema.extend({
    client: z
      .object({
        connect: z.object({
          id: z.string(),
        }),
        disconnect: z.boolean(),
      })
      .partial(),
  }).partial() satisfies z.Schema<Prisma.ProductCategoryUpdateInput>,
) {}
