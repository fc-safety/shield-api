import { createZodDto } from 'nestjs-zod';
import { CreateConsumableSchema } from './create-consumable.dto';

export class UpdateConsumableDto extends createZodDto(
  CreateConsumableSchema.partial(),
) {}
