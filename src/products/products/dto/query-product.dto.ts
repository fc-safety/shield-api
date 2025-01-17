import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaBoolFilter,
  prismaDateTimeFilter,
  prismaEnumFilter,
  prismaNumberFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryProductFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    active: prismaBoolFilter(z.coerce.boolean()),
    manufacturer: z
      .object({
        id: prismaStringFilter(z.string()),
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
  })
  .partial() satisfies z.Schema<Prisma.ProductWhereInput>;

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

export class QueryProductDto extends createZodDto(
  QueryProductFiltersSchema.extend(
    buildFixedQuerySchema(QueryProductOrderSchema),
  ),
) {}
