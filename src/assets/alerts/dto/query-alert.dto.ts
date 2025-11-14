import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryAlertFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    assetId: prismaStringFilter(z.string()),
  })
  .partial() satisfies z.Schema<Prisma.AlertWhereInput>;

const QueryAlertOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    assetId: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.AlertOrderByWithRelationInput>;

export const QueryAlertSchema = QueryAlertFiltersSchema.extend(
  buildFixedQuerySchema(QueryAlertOrderSchema),
);

export class QueryAlertDto extends createZodDto(QueryAlertSchema) {}
