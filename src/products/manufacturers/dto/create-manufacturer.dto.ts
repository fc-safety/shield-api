import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateManufacturerSchema = z.object({
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
