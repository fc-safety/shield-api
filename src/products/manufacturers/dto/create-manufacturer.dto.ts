import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateManufacturerSchema = z.object({
  legacyManufacturerId: z.string().optional().nullable(),
  name: z.string(),
  homeUrl: z.string().optional(),
  active: z.boolean().optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.ManufacturerCreateInput>;

export class CreateManufacturerDto extends createZodDto(
  CreateManufacturerSchema,
) {}
