import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { MINIMUM_INSPECTION_CYCLE } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateClientSchema = z.object({
  externalId: z.string().optional(),
  name: z.string(),
  startedOn: z.string().datetime(),
  address: z.object({
    create: createAddressSchema,
  }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  phoneNumber: z.string(),
  homeUrl: z.string().optional(),
  defaultInspectionCycle: z.number().min(MINIMUM_INSPECTION_CYCLE).optional(),
}) satisfies z.Schema<Prisma.ClientCreateInput>;

export class CreateClientDto extends createZodDto(CreateClientSchema) {}
