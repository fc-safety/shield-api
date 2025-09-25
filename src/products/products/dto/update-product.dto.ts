import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateProductSchema } from './create-product.dto';

export class UpdateProductDto extends createZodDto(
  CreateProductSchema.extend({
    client: z
      .object({
        connect: z.object({
          id: z.string(),
        }),
        disconnect: z.boolean(),
      })
      .partial(),
  }).partial() satisfies z.Schema<Prisma.ProductUpdateInput>,
) {}
