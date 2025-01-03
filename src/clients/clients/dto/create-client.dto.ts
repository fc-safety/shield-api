import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { z } from 'zod';

export const CreateClientSchema = z.object({
  externalId: z.string().optional(),
  name: z.string(),
  startedOn: z.coerce.date(),
  address: z.object({
    create: createAddressSchema,
  }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  phoneNumber: z.string(),
  homeUrl: z.string().optional(),
}) satisfies z.Schema<Prisma.ClientCreateInput>;

export class CreateClientDto extends createZodDto(CreateClientSchema) {}
