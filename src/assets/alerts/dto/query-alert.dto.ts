import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryAlertFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
  })
  .partial() satisfies z.Schema<Prisma.AlertWhereInput>;

const QueryAlertOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.AlertOrderByWithRelationInput>;

export const QueryAlertSchema = QueryAlertFiltersSchema.extend(
  buildFixedQuerySchema(QueryAlertOrderSchema),
);

export class QueryAlertDto extends createZodDto(QueryAlertSchema) {}
