import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryProductCateogryFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    name: prismaStringFilter(z.string()),
    shortName: prismaStringFilter(z.string()),
    description: prismaStringFilter(z.string()),
    icon: prismaStringFilter(z.string()),
    color: prismaStringFilter(z.string()),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.ProductCategoryWhereInput>;

const QueryProductCateogryOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    name: PrismaOrderEmum,
    shortName: PrismaOrderEmum,
    description: PrismaOrderEmum,
    icon: PrismaOrderEmum,
    color: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.ProductCategoryOrderByWithRelationInput>;

export class QueryProductCategoryDto extends createZodDto(
  QueryProductCateogryFiltersSchema.extend(
    buildFixedQuerySchema(QueryProductCateogryOrderSchema),
  ),
) {}
