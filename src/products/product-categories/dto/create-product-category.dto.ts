import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateProductCategorySchema = z.object({
  active: z.boolean().default(true),
  name: z.string(),
  shortName: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
}) satisfies z.Schema<Prisma.ProductCategoryCreateInput>;

export class CreateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema,
) {}
