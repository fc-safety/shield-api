import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateUserSchema = z.object({
  active: z.boolean().optional(),
  firstName: z.string().nonempty(),
  lastName: z.string().nonempty(),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  position: z.string().optional(),
  siteExternalId: z.string().nonempty(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
