import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export class UpdateUserDto extends createZodDto(
  z
    .object({
      active: z.boolean().optional(),
      firstName: z.string().nonempty().optional(),
      lastName: z.string().nonempty().optional(),
      email: z.string().email().optional(),
      phoneNumber: z.string().optional().nullable(),
    })
    .partial(),
) {}
