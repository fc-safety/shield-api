import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const BaseQueryProductCateogryFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    name: prismaStringFilter(z.string()),
    shortName: prismaStringFilter(z.string()),
    description: prismaStringFilter(z.string()),
    icon: prismaStringFilter(z.string()),
    color: prismaStringFilter(z.string()),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
    clientId: prismaStringFilter(z.string(), { nullable: true }),
  })
  .partial() satisfies z.Schema<Prisma.ProductCategoryWhereInput>;

const QueryProductCateogryFiltersSchema =
  BaseQueryProductCateogryFiltersSchema.extend({
    OR: z.array(BaseQueryProductCateogryFiltersSchema),
    AND: z.array(BaseQueryProductCateogryFiltersSchema),
  }).partial() satisfies z.Schema<Prisma.ProductCategoryWhereInput>;

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
