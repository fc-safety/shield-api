import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaBoolFilter,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryInspectionRouteFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    name: prismaStringFilter(z.string()),
    siteId: prismaStringFilter(z.string()),
    clientId: prismaStringFilter(z.string()),
    site: z
      .object({
        active: prismaBoolFilter(z.stringbool()),
      })
      .partial(),
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
