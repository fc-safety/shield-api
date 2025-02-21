import { PartialType } from '@nestjs/swagger';
import { CreateInspectionRouteDto } from './create-inspection-route.dto';

export class UpdateInspectionRouteDto extends PartialType(CreateInspectionRouteDto) {}
