import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryTagFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    serialNumber: prismaStringFilter(z.string()),
    site: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.TagWhereInput>;

const QueryTagOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    serialNumber: PrismaOrderEmum,
    site: z
      .object({
        id: PrismaOrderEmum,
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.TagOrderByWithRelationInput>;

export const QueryTagSchema = QueryTagFiltersSchema.extend(
  buildFixedQuerySchema(QueryTagOrderSchema),
);

export class QueryTagDto extends createZodDto(QueryTagSchema) {}
