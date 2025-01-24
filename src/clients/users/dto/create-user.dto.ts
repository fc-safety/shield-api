import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateUserSchema = z.object({
  firstName: z.string().nonempty(),
  lastName: z.string().nonempty(),
  email: z.string().email(),
  siteExternalId: z.string().nonempty(),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
