import { createZodDto } from 'nestjs-zod';
import {
  buildFixedQuerySchema,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryUserFiltersSchema = z
  .object({
    id: z.union([z.string(), z.object({ in: z.array(z.string()) })]).optional(),
    firstName: prismaStringFilter(z.string()).optional(),
    lastName: prismaStringFilter(z.string()).optional(),
    email: prismaStringFilter(z.string()).optional(),
    phoneNumber: prismaStringFilter(z.string()).optional(),
    active: z.boolean().optional(),
  })
  .partial() satisfies z.Schema<Prisma.PersonWhereInput>;

const QueryUserOrderSchema = z
  .object({
    firstName: PrismaOrderEmum.optional(),
    lastName: PrismaOrderEmum.optional(),
    email: PrismaOrderEmum.optional(),
    createdOn: PrismaOrderEmum.optional(),
  })
  .partial() satisfies z.Schema<Prisma.PersonOrderByWithRelationInput>;

export const QueryUserSchema = QueryUserFiltersSchema.extend(
  buildFixedQuerySchema(QueryUserOrderSchema),
);

export class QueryUserDto extends createZodDto(QueryUserSchema) {}
