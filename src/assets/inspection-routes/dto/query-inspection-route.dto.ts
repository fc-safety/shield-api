import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryInspectionRouteFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    name: prismaStringFilter(z.string()),
    siteId: prismaStringFilter(z.string()),
    clientId: prismaStringFilter(z.string()),
  })
  .partial();

const QueryInspectionRouteOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
    name: PrismaOrderEmum,
    site: z
      .object({
        name: PrismaOrderEmum,
      })
      .partial(),
    client: z
      .object({
        name: PrismaOrderEmum,
      })
      .partial(),
  })
  .partial();

export class QueryInspectionRouteDto extends createZodDto(
  QueryInspectionRouteFiltersSchema.extend(
    buildFixedQuerySchema(QueryInspectionRouteOrderSchema),
  ),
) {}
