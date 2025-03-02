import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateTagSchema } from './create-tag.dto';

const DisconnectableSchema = z
  .object({
    connect: z.object({
      id: z.string(),
    }),
    disconnect: z.boolean(),
  })
  .partial();

export const UpdateTagSchema = CreateTagSchema.extend({
  client: DisconnectableSchema,
  site: DisconnectableSchema,
  asset: DisconnectableSchema,
}).partial() satisfies z.Schema<Prisma.TagUpdateInput>;

export class UpdateTagDto extends createZodDto(UpdateTagSchema) {}
