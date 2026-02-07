import { createZodDto } from 'nestjs-zod';
import z from 'zod';

export class UpdateUserDto extends createZodDto(
  z
    .object({
      legacyUserId: z.string().optional().nullable(),
      active: z.boolean().optional(),
      firstName: z.string().nonempty(),
      lastName: z.string().nonempty(),
      email: z.email(),
      username: z.string().optional(),
      phoneNumber: z.string().optional(),
      position: z.string().optional(),
      siteExternalId: z.string().nonempty(),
      password: z.string().min(8).optional(),
    })
    .partial(),
) {}
