import { createZodDto } from 'nestjs-zod';
import { filterAddressSchema, orderAddressSchema } from 'src/common/schema';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  prismaEnumFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryClientFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.iso.datetime()),
    modifiedOn: prismaDateTimeFilter(z.iso.datetime()),
    externalId: prismaStringFilter(z.string()),
    status: prismaEnumFilter(z.enum(['ACTIVE', 'INACTIVE', 'PENDING'])),
    startedOn: prismaDateTimeFilter(z.iso.datetime()),
    address: filterAddressSchema,
  })
  .partial() satisfies z.Schema<Prisma.ClientWhereInput>;

const QueryClientOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    updatedOn: PrismaOrderEmum,
    externalId: PrismaOrderEmum,
    name: PrismaOrderEmum,
    status: PrismaOrderEmum,
    startedOn: PrismaOrderEmum,
    address: orderAddressSchema,
  })
  .partial() satisfies z.Schema<Prisma.ClientOrderByWithRelationInput>;

export class QueryClientDto extends createZodDto(
  QueryClientFiltersSchema.extend(
    buildFixedQuerySchema(QueryClientOrderSchema),
  ),
) {}
