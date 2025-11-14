import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryInspectionFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    asset: z.object({
      id: prismaStringFilter(z.string()),
      name: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.InspectionWhereInput>;

const QueryAssetOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    asset: z.object({
      id: PrismaOrderEmum,
      name: PrismaOrderEmum,
    }),
  })
  .partial() satisfies z.Schema<Prisma.InspectionOrderByWithRelationInput>;

const QueryInspectionIncludeSchema = z
  .object({
    asset: z.union([
      z.object({
        include: z
          .object({
            tag: z.coerce.boolean(),
          })
          .partial(),
      }),
      z.coerce.boolean(),
    ]),
  })
  .partial() satisfies z.Schema<Prisma.InspectionInclude>;

export class QueryInspectionDto extends createZodDto(
  QueryInspectionFiltersSchema.extend(
    buildFixedQuerySchema(QueryAssetOrderSchema, QueryInspectionIncludeSchema),
  ),
) {}
