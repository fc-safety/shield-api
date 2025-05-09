import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { MINIMUM_INSPECTION_CYCLE } from 'src/notifications/notification-types';
import { z } from 'zod';

export const CreateAssetSchema = z.object({
  active: z.boolean().default(true),
  name: z.string(),
  location: z.string(),
  placement: z.string(),
  serialNumber: z.string(),
  inspectionCycle: z
    .number()
    .min(MINIMUM_INSPECTION_CYCLE)
    .nullable()
    .optional(),
  product: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  tag: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  site: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.AssetCreateInput>;

export class CreateAssetDto extends createZodDto(CreateAssetSchema) {}
