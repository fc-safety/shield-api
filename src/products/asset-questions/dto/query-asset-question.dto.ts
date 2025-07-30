import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaBoolFilter,
  prismaDateTimeFilter,
  prismaEnumFilter,
  prismaNumberFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import {
  AssetQuestionResponseType,
  AssetQuestionType,
  Prisma,
} from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryAssetQuestionFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    active: prismaBoolFilter(z.boolean()),
    type: prismaEnumFilter(
      z.enum(
        Object.values(AssetQuestionType) as [
          AssetQuestionType,
          ...AssetQuestionType[],
        ],
      ),
    ),
    required: prismaBoolFilter(z.boolean()),
    order: prismaNumberFilter(z.number()),
    prompt: prismaStringFilter(z.string()),
    valueType: prismaEnumFilter(
      z.enum(
        Object.values(AssetQuestionResponseType) as [
          AssetQuestionResponseType,
          ...AssetQuestionResponseType[],
        ],
      ),
    ),
    tone: prismaStringFilter(z.string()),
    productCategoryId: prismaStringFilter(z.string()),
    productId: prismaStringFilter(z.string()),
    parentQuestionId: prismaStringFilter(z.string()),
    productCategory: z.object({
      id: prismaStringFilter(z.string()),
      name: prismaStringFilter(z.string()),
    }),
    product: z.object({
      id: prismaStringFilter(z.string()),
      name: prismaStringFilter(z.string()),
    }),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.AssetQuestionWhereInput>;

const QueryAssetQuestionOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
    active: PrismaOrderEmum,
    type: PrismaOrderEmum,
    required: PrismaOrderEmum,
    order: PrismaOrderEmum,
    prompt: PrismaOrderEmum,
    valueType: PrismaOrderEmum,
    tone: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.AssetQuestionOrderByWithRelationInput>;

export class QueryAssetQuestionDto extends createZodDto(
  QueryAssetQuestionFiltersSchema.extend(
    buildFixedQuerySchema(QueryAssetQuestionOrderSchema),
  ),
) {}
