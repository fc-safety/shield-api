import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaBoolFilter,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryManufacturerFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    active: prismaBoolFilter(z.coerce.boolean()),
    name: prismaStringFilter(z.string()),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.ManufacturerWhereInput>;

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
