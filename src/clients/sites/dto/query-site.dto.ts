import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { filterAddressSchema, orderAddressSchema } from 'src/common/schema';
import {
  buildFixedQuerySchema,
  emptyAsObject,
  prismaBoolFilter,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const BaseQuerySiteFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    externalId: prismaStringFilter(z.string()),
    address: filterAddressSchema,
    primary: prismaBoolFilter(z.coerce.boolean()),
    parentSiteId: prismaStringFilter(z.string()),
    clientId: prismaStringFilter(z.string()),
  })
  .partial() satisfies z.Schema<Prisma.SiteWhereInput>;

const BaseQuerySiteFilterSchemaWithSubsites = BaseQuerySiteFiltersSchema.extend(
  {
    subsites: z
      .object({
        every: emptyAsObject(BaseQuerySiteFiltersSchema),
        some: emptyAsObject(BaseQuerySiteFiltersSchema),
        none: emptyAsObject(BaseQuerySiteFiltersSchema),
      })
      .partial(),
  },
).partial();

const QuerySiteFiltersSchema = BaseQuerySiteFilterSchemaWithSubsites.extend({
  OR: z.array(BaseQuerySiteFilterSchemaWithSubsites).optional(),
});

const QuerySiteOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    externalId: PrismaOrderEmum,
    name: PrismaOrderEmum,
    address: orderAddressSchema,
    primary: PrismaOrderEmum,
  })
  .partial();

export class QuerySiteDto extends createZodDto(
  QuerySiteFiltersSchema.extend(buildFixedQuerySchema(QuerySiteOrderSchema)),
) {}
