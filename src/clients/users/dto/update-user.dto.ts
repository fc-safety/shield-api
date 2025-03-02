import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema } from './create-user.dto';

export class UpdateUserDto extends createZodDto(CreateUserSchema.partial()) {}
