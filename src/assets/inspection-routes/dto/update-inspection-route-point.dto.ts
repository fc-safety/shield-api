import { createZodDto } from 'nestjs-zod';
import { CreateInspectionRoutePointSchema } from './create-inspection-route-point.dto';

export class UpdateInspectionRoutePointDto extends createZodDto(
  CreateInspectionRoutePointSchema.partial(),
) {}
