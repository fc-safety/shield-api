import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  password: z.string().min(8),
  sendEmail: z.boolean(),
});

export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
