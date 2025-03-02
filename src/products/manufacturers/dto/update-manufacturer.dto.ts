import { createZodDto } from 'nestjs-zod';
import { CreateManufacturerSchema } from './create-manufacturer.dto';

export class UpdateManufacturerDto extends createZodDto(
  CreateManufacturerSchema.partial(),
) {}
