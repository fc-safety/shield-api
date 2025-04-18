import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  prismaEnumFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma, ProductRequestStatus } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryProductRequestFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    asset: z.object({
      id: prismaStringFilter(z.string()),
      name: prismaStringFilter(z.string()),
    }),
    status: prismaEnumFilter(
      z.enum(
        Object.values(ProductRequestStatus) as [
          ProductRequestStatus,
          ...ProductRequestStatus[],
        ],
      ),
    ),
  })
  .partial() satisfies z.Schema<Prisma.ProductRequestWhereInput>;

const QueryProductRequestOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    asset: z.object({
      id: PrismaOrderEmum,
      name: PrismaOrderEmum,
    }),
  })
  .partial() satisfies z.Schema<Prisma.ProductRequestOrderByWithRelationInput>;

export class QueryProductRequestDto extends createZodDto(
  QueryProductRequestFiltersSchema.extend(
    buildFixedQuerySchema(QueryProductRequestOrderSchema),
  ),
) {}
