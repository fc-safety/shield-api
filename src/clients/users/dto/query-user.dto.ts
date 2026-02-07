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
    personId: z
      .union([
        z.string(),
        z.object({ in: z.array(z.string()) }),
      ])
      .optional(),
    person: z
      .object({
        firstName: prismaStringFilter(z.string()).optional(),
        lastName: prismaStringFilter(z.string()).optional(),
        email: prismaStringFilter(z.string()).optional(),
        active: z.boolean().optional(),
      })
      .optional(),
    site: z
      .object({
        externalId: z.string().optional(),
      })
      .optional(),
  })
  .partial() satisfies z.Schema<Prisma.PersonClientAccessWhereInput>;

const QueryUserOrderSchema = z
  .object({
    person: z
      .object({
        firstName: PrismaOrderEmum.optional(),
        lastName: PrismaOrderEmum.optional(),
        email: PrismaOrderEmum.optional(),
      })
      .optional(),
    site: z
      .object({
        externalId: PrismaOrderEmum.optional(),
      })
      .optional(),
  })
  .partial() satisfies z.Schema<Prisma.PersonClientAccessOrderByWithRelationInput>;

export const QueryUserSchema = QueryUserFiltersSchema.extend(
  buildFixedQuerySchema(QueryUserOrderSchema),
);

export class QueryUserDto extends createZodDto(QueryUserSchema) {}
