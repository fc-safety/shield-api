import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import z from 'zod';
import { CreateProductCategorySchema } from './create-product-category.dto';

export class UpdateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema.partial()
    .extend({
      active: z.boolean().optional(), // remove default value (https://zod.dev/v4/changelog?id=defaults-applied-within-optional-fields)
      client: z
        .object({
          connect: z.object({
            id: z.string(),
          }),
          disconnect: z.boolean(),
        })
        .partial(),
    })
    .partial() satisfies z.Schema<Prisma.ProductCategoryUpdateInput>,
) {}
