import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const QueryConsumableFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    expiresOn: prismaDateTimeFilter(z.coerce.date()),
    asset: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    assetId: prismaStringFilter(z.string()),
    product: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    site: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.ConsumableWhereInput>;

const QueryConsumableOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
    expiresOn: PrismaOrderEmum,
    asset: z
      .object({
        id: PrismaOrderEmum,
      })
      .partial(),
    product: z
      .object({
        id: PrismaOrderEmum,
      })
      .partial(),
    site: z
      .object({
        id: PrismaOrderEmum,
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.ConsumableOrderByWithRelationInput>;

export const QueryConsumableSchema = QueryConsumableFiltersSchema.extend(
  buildFixedQuerySchema(QueryConsumableOrderSchema),
);

export class QueryConsumableDto extends createZodDto(QueryConsumableSchema) {}
