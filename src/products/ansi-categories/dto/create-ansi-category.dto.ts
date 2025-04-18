import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateAnsiCategorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
}) satisfies z.Schema<Prisma.AnsiCategoryCreateInput>;

export class CreateAnsiCategoryDto extends createZodDto(
  CreateAnsiCategorySchema,
) {}
