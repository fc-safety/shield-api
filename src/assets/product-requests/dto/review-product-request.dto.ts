import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateProductRequestApprovalSchema = z.object({
  approved: z.boolean(),
}) satisfies z.Schema<Prisma.ProductRequestApprovalCreateWithoutProductRequestInput>;

export const ReviewProductRequestSchema = z.object({
  productRequestApprovals: z.object({
    create: CreateProductRequestApprovalSchema,
  }),
}) satisfies z.Schema<Prisma.ProductRequestUpdateInput>;

export class ReviewProductRequestDto extends createZodDto(
  ReviewProductRequestSchema,
) {}
