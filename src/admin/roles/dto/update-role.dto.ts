import { createZodDto } from 'nestjs-zod';
import { CreateRoleSchema } from './create-role.dto';

export class UpdateRoleDto extends createZodDto(CreateRoleSchema.partial()) {}
