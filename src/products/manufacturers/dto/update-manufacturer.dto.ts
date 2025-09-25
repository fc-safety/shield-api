import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import z from 'zod';
import { CreateManufacturerSchema } from './create-manufacturer.dto';

export class UpdateManufacturerDto extends createZodDto(
  CreateManufacturerSchema.extend({
    client: z
      .object({
        connect: z.object({
          id: z.string(),
        }),
        disconnect: z.boolean(),
      })
      .partial(),
  }).partial() satisfies z.Schema<Prisma.ManufacturerUpdateInput>,
) {}
