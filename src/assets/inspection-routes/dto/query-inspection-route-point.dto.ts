import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  prismaNumberFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryInspectionRoutePointFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    order: prismaNumberFilter(z.number()),
    assetId: prismaStringFilter(z.string()),
    siteId: prismaStringFilter(z.string()),
    clientId: prismaStringFilter(z.string()),
  })
  .partial();

const QueryInspectionRoutePointOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
    order: PrismaOrderEmum,
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

export class QueryInspectionRoutePointDto extends createZodDto(
  QueryInspectionRoutePointFiltersSchema.extend(
    buildFixedQuerySchema(QueryInspectionRoutePointOrderSchema),
  ),
) {}
