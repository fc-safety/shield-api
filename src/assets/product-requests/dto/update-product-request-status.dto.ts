import { createZodDto } from 'nestjs-zod';
import { Prisma, ProductRequestStatus } from 'src/generated/prisma/client';
import { z } from 'zod';

const UpdateProductRequestStatusSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(
    Object.values(ProductRequestStatus) as [
      ProductRequestStatus,
      ...ProductRequestStatus[],
    ],
  ),
}) satisfies z.Schema<Prisma.ProductRequestUpdateInput>;

export class UpdateProductRequestStatusDto extends createZodDto(
  UpdateProductRequestStatusSchema,
) {}
