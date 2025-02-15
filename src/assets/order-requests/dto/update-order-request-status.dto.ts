import { Prisma, ProductRequestStatus } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateOrderRequestStatusSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(
    Object.values(ProductRequestStatus) as [
      ProductRequestStatus,
      ...ProductRequestStatus[],
    ],
  ),
}) satisfies z.Schema<Prisma.ProductRequestUpdateInput>;

export class UpdateOrderRequestStatusDto extends createZodDto(
  UpdateOrderRequestStatusSchema,
) {}
