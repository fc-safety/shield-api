import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { filterAddressSchema, orderAddressSchema } from 'src/common/schema';
import {
  buildFixedQuerySchema,
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
    parentSiteId: prismaStringFilter(
      z.string(),
      z.string().transform((id) => (id === 'null' ? null : id)),
    ),
    clientId: prismaStringFilter(z.string()),
  })
  .partial() satisfies z.Schema<Prisma.SiteWhereInput>;

const BaseQuerySiteFilterSchemaWithSubsites = BaseQuerySiteFiltersSchema.extend(
  {
    subsites: z
      .object({
        every: BaseQuerySiteFiltersSchema,
        some: BaseQuerySiteFiltersSchema,
        none: z.preprocess((data) => {
          if (data === undefined || data === '') {
            return {};
          }
          return data;
        }, BaseQuerySiteFiltersSchema),
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
