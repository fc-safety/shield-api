import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryAnsiCategoryFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    name: prismaStringFilter(z.string()),
    description: prismaStringFilter(z.string()),
    color: prismaStringFilter(z.string()),
  })
  .partial() satisfies z.Schema<Prisma.AnsiCategoryWhereInput>;

const QueryAnsiCategoryOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    name: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.AnsiCategoryOrderByWithRelationInput>;

export class QueryAnsiCategoryDto extends createZodDto(
  QueryAnsiCategoryFiltersSchema.extend(
    buildFixedQuerySchema(QueryAnsiCategoryOrderSchema),
  ),
) {}
