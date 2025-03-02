import { createZodDto } from 'nestjs-zod';
import { CreateProductSchema } from './create-product.dto';

export class UpdateProductDto extends createZodDto(
  CreateProductSchema.partial(),
) {}
