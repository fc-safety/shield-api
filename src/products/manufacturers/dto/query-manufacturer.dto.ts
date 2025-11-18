import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaBoolFilter,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const BaseQueryManufacturerFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    active: prismaBoolFilter(z.coerce.boolean()),
    name: prismaStringFilter(z.string()),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
    clientId: prismaStringFilter(z.string(), { nullable: true }),
  })
  .partial() satisfies z.Schema<Prisma.ManufacturerWhereInput>;

const QueryManufacturerFiltersSchema =
  BaseQueryManufacturerFiltersSchema.extend({
    OR: z.array(BaseQueryManufacturerFiltersSchema),
    AND: z.array(BaseQueryManufacturerFiltersSchema),
  }).partial() satisfies z.Schema<Prisma.ManufacturerWhereInput>;

const QueryManufacturerOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    name: PrismaOrderEmum,
    active: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.ManufacturerOrderByWithRelationInput>;

export class QueryManufacturerDto extends createZodDto(
  QueryManufacturerFiltersSchema.extend(
    buildFixedQuerySchema(QueryManufacturerOrderSchema),
  ),
) {}
