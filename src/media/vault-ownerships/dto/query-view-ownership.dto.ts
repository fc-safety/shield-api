import { Prisma, VaultAccessType } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  prismaDateTimeFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { z } from 'zod';

const QueryViewOwnershipFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    createdOn: prismaDateTimeFilter(z.coerce.date()),
    modifiedOn: prismaDateTimeFilter(z.coerce.date()),
    key: prismaStringFilter(z.string()),
    bucketName: prismaStringFilter(z.string()),
    accessType: z.enum(
      Object.values(VaultAccessType) as [VaultAccessType, ...VaultAccessType[]],
    ),
    owner: z.object({
      id: prismaStringFilter(z.string()),
    }),
    site: z.object({
      id: prismaStringFilter(z.string()),
    }),
    client: z.object({
      id: prismaStringFilter(z.string()),
    }),
  })
  .partial() satisfies z.Schema<Prisma.VaultOwnershipWhereInput>;

const QueryViewOwnershipOrderSchema = z
  .object({
    id: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
    key: PrismaOrderEmum,
    bucketName: PrismaOrderEmum,
    accessType: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.VaultOwnershipOrderByWithRelationInput>;

export const QueryViewOwnershipSchema = QueryViewOwnershipFiltersSchema.extend(
  buildFixedQuerySchema(QueryViewOwnershipOrderSchema),
);

export class QueryViewOwnershipDto extends createZodDto(
  QueryViewOwnershipSchema,
) {}
