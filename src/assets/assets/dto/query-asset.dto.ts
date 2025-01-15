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

const QueryAssetFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    active: prismaBoolFilter(z.coerce.boolean()),
    site: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.AssetWhereInput>;

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
