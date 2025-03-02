import { createZodDto } from 'nestjs-zod';
import { CreateAnsiCategorySchema } from './create-ansi-category.dto';

export class UpdateAnsiCategoryDto extends createZodDto(
  CreateAnsiCategorySchema.partial(),
) {}
