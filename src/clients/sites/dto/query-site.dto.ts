import { createZodDto } from 'nestjs-zod';
import { filterAddressSchema, orderAddressSchema } from 'src/common/schema';
import {
  booleanString,
  buildFixedQuerySchema,
  emptyAsObject,
  prismaBoolFilter,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const BaseQuerySiteFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    active: prismaBoolFilter(z.stringbool()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    externalId: prismaStringFilter(z.string()),
    address: filterAddressSchema,
    primary: prismaBoolFilter(z.stringbool()),
    parentSiteId: prismaStringFilter(z.string(), { nullable: true }),
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

const QuerySiteIncludeSchema = z
  .object({
    subsites: z.union([
      z.object({
        include: z
          .object({
            address: booleanString,
          })
          .partial(),
      }),
      booleanString,
    ]),
  })
  .partial() satisfies z.Schema<Prisma.SiteInclude>;

export class QuerySiteDto extends createZodDto(
  QuerySiteFiltersSchema.extend(
    buildFixedQuerySchema(QuerySiteOrderSchema, QuerySiteIncludeSchema),
  ),
) {}
