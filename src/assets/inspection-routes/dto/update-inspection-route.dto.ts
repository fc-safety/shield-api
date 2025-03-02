import { createZodDto } from 'nestjs-zod';
import { CreateInspectionRouteSchema } from './create-inspection-route.dto';

export class UpdateInspectionRouteDto extends createZodDto(
  CreateInspectionRouteSchema.partial(),
) {}
