import { createZodDto } from 'nestjs-zod';
import { buildFixedQuerySchema, PrismaOrderEmum } from 'src/common/validation';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const QueryInvitationFiltersSchema = z
  .object({
    status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']).optional(),
    clientId: z.string().optional(),
  })
  .partial() satisfies z.Schema<Prisma.InvitationWhereInput>;

const QueryInvitationOrderSchema = z
  .object({
    createdOn: PrismaOrderEmum,
    modifiedOn: PrismaOrderEmum,
  })
  .partial() satisfies z.Schema<Prisma.InvitationOrderByWithRelationInput>;

export const QueryInvitationsSchema = QueryInvitationFiltersSchema.extend(
  buildFixedQuerySchema(QueryInvitationOrderSchema),
);

export class QueryInvitationDto extends createZodDto(QueryInvitationsSchema) {}
