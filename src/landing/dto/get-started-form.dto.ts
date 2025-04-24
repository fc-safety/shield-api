import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GetStartedFormSchema = z.object({
  firstName: z.string().nonempty('First name is required'),
  lastName: z.string().nonempty('Last name is required'),
  companyName: z.string().nonempty('Company name is required'),
  email: z.string().email(),
  phone: z.string().nonempty('Phone number is required'),
  message: z.string().optional(),
});

export class GetStartedFormDto extends createZodDto(GetStartedFormSchema) {}
