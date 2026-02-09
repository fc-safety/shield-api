import { createZodDto } from 'nestjs-zod';
import {
  booleanString,
  buildFixedQuerySchema,
  prismaBoolFilter,
  PrismaOrderEmum,
  prismaStringFilter,
} from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryMemberFiltersSchema = z
  .object({
    id: prismaStringFilter(z.string()),
    firstName: prismaStringFilter(z.string()),
    lastName: prismaStringFilter(z.string()),
    email: prismaStringFilter(z.string()),
    active: prismaBoolFilter(booleanString),
    position: prismaStringFilter(z.string()),
    clientAccess: z
      .object({
        some: z
          .object({
            roleId: prismaStringFilter(z.string()),
            siteId: prismaStringFilter(z.string()),
          })
          .partial(),
      })
      .partial(),
  })
  .partial() satisfies z.Schema<Prisma.PersonWhereInput>;

const QueryMemberOrderSchema = z
  .object({
    firstName: PrismaOrderEmum,
    lastName: PrismaOrderEmum,
    email: PrismaOrderEmum,
    createdOn: PrismaOrderEmum,
  })
  .partial();

export class QueryMemberDto extends createZodDto(
  QueryMemberFiltersSchema.extend(
    buildFixedQuerySchema(QueryMemberOrderSchema),
  ),
) {}
