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

const BaseQueryAssetFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    active: prismaBoolFilter(z.stringbool()),
    tagId: prismaStringFilter(z.string(), { nullable: true }),
    site: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    client: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    siteId: prismaStringFilter(z.string()),
    clientId: prismaStringFilter(z.string()),
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
