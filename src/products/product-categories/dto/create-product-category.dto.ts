import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateProductCategorySchema = z.object({
  active: z.boolean().default(true),
  name: z.string(),
  shortName: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.ProductCategoryCreateInput>;

export class CreateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema,
) {}
