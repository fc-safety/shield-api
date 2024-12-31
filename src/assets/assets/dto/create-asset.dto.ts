import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateAssetSchema = z.object({
  active: z.boolean().default(true),
  name: z.string(),
  location: z.string(),
  placement: z.string(),
  serialNumber: z.string(),
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
