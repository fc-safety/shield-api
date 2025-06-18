import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from 'src/common/schema';
import { Prisma } from 'src/generated/prisma/client';
import { MINIMUM_INSPECTION_CYCLE } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateClientSchema = z.object({
  createdOn: z.string().datetime().optional(),
  externalId: z.string().optional(),
  name: z.string(),
  startedOn: z.string().datetime(),
  address: z.object({
    create: createAddressSchema,
  }),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'LEGACY']).optional(),
  phoneNumber: z.string(),
  homeUrl: z.string().optional(),
  defaultInspectionCycle: z.number().min(MINIMUM_INSPECTION_CYCLE).optional(),
  demoMode: z.boolean().optional(),
}) satisfies z.Schema<Prisma.ClientCreateInput>;

export class CreateClientDto extends createZodDto(CreateClientSchema) {}
