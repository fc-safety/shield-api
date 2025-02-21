import { PartialType } from '@nestjs/mapped-types';
import { CreateInspectionRoutePointDto } from './create-inspection-route-point.dto';

export class UpdateInspectionRoutePointDto extends PartialType(
  CreateInspectionRoutePointDto,
) {}
