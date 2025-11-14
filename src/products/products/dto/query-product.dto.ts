import { createZodDto } from 'nestjs-zod';
import { QueryConsumableFiltersSchema } from 'src/assets/consumables/dto/query-consumable.dto';
import {
  booleanString,
  buildFixedQuerySchema,
  emptyAsObject,
  prismaBoolFilter,
  prismaDateTimeFilter,
  prismaEnumFilter,
  prismaNumberFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const BaseQueryProductFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    active: prismaBoolFilter(z.stringbool()),
    manufacturer: z
      .object({
        id: prismaStringFilter(z.string()),
        name: prismaStringFilter(z.string()),
      })
      .partial(),
    type: prismaEnumFilter(z.enum(['PRIMARY', 'CONSUMABLE'])),
    name: prismaStringFilter(z.string()),
    description: prismaStringFilter(z.string()),
    sku: prismaStringFilter(z.string()),
    productUrl: prismaStringFilter(z.string()),
    imageUrl: prismaStringFilter(z.string()),
    productCategory: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    parentProductId: prismaStringFilter(z.string(), { nullable: true }),
    parentProduct: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    quantity: prismaNumberFilter(z.number().int()),
    price: prismaNumberFilter(z.number()),
    ansiCategory: z
      .object({
        id: prismaStringFilter(z.string()),
      })
      .partial(),
    perishable: prismaBoolFilter(z.coerce.boolean()),
    ansiMinimumRequired: prismaBoolFilter(z.coerce.boolean()),
    consumableProducts: z
      .object({
        every: emptyAsObject(QueryConsumableFiltersSchema),
        some: emptyAsObject(QueryConsumableFiltersSchema),
        none: emptyAsObject(QueryConsumableFiltersSchema),
      })
      .partial(),
    client: z.object({
      externalId: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.ProductWhereInput>;

const QueryProductFiltersSchema = BaseQueryProductFiltersSchema.extend({
  OR: z.array(BaseQueryProductFiltersSchema),
}).partial() satisfies z.Schema<Prisma.ProductWhereInput>;

const QueryProductOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    active: PrismaOrderEmum,
    manufacturer: z
      .object({
        id: PrismaOrderEmum,
        name: PrismaOrderEmum,
      })
      .partial(),
    type: PrismaOrderEmum,
    name: PrismaOrderEmum,
    description: PrismaOrderEmum,
    sku: PrismaOrderEmum,
    productUrl: PrismaOrderEmum,
    imageUrl: PrismaOrderEmum,
    productCategory: z
      .object({
        id: PrismaOrderEmum,
        name: PrismaOrderEmum,
      })
      .partial(),
    parentProduct: z
      .object({
        id: PrismaOrderEmum,
        name: PrismaOrderEmum,
      })
      .partial(),
    quantity: PrismaOrderEmum,
    price: PrismaOrderEmum,
    ansiCategory: z
      .object({
        id: PrismaOrderEmum,
        name: PrismaOrderEmum,
      })
      .partial(),
    perishable: PrismaOrderEmum,
    ansiMinimumRequired: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.ProductOrderByWithRelationInput>;

const QueryProductIncludeSchema = z
  .object({
    consumableProducts: z.union([
      z.coerce.boolean(),
      z.object({
        include: z
          .object({
            ansiCategory: z.boolean(),
            productCategory: z.boolean(),
            manufacturer: z.boolean(),
          })
          .partial(),
      }),
    ]),
    parentProduct: z.union([
      z.object({
        include: z
          .object({
            ansiCategory: z.boolean(),
            productCategory: z.boolean(),
            manufacturer: z.boolean(),
          })
          .partial(),
      }),
      booleanString,
    ]),
  })
  .partial() satisfies z.Schema<Prisma.ProductInclude>;

export class QueryProductDto extends createZodDto(
  QueryProductFiltersSchema.extend(
    buildFixedQuerySchema(QueryProductOrderSchema, QueryProductIncludeSchema),
  ),
) {}
