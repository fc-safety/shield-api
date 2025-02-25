import { PartialType } from '@nestjs/mapped-types';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { CreateTagDto, CreateTagSchema } from './create-tag.dto';

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

export class UpdateTagDto extends PartialType(CreateTagDto) {}
