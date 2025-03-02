import { createZodDto } from 'nestjs-zod';
import { CreateProductCategorySchema } from './create-product-category.dto';

export class UpdateProductCategoryDto extends createZodDto(
  CreateProductCategorySchema.partial(),
) {}
