import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const DuplicateDemoClientSchema = z.object({
  name: z.string().min(1),
  emailDomain: z.string().min(1),
  password: z.string().min(8),
});

export class DuplicateDemoClientDto extends createZodDto(
  DuplicateDemoClientSchema,
) {}
