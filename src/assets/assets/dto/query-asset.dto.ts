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

const BaseQueryAssetFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    active: prismaBoolFilter(z.coerce.boolean()),
    tagId: prismaStringFilter(z.string()),
    site: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.AssetWhereInput>;

const QueryAssetFiltersSchema = BaseQueryAssetFiltersSchema.extend({
  OR: z.array(BaseQueryAssetFiltersSchema),
  AND: z.array(BaseQueryAssetFiltersSchema),
}).partial() satisfies z.Schema<Prisma.AssetWhereInput>;

const QueryAssetOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    name: PrismaOrderEmum,
    active: PrismaOrderEmum,
    site: z
      .object({
        id: PrismaOrderEmum,
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.AssetOrderByWithRelationInput>;

export const QueryAssetSchema = QueryAssetFiltersSchema.extend(
  buildFixedQuerySchema(QueryAssetOrderSchema),
);

export class QueryAssetDto extends createZodDto(QueryAssetSchema) {}
