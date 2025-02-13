import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateOrderRequestSchema } from './create-order-request.dto';

const UpdateOrderRequestSchema = CreateOrderRequestSchema.pick({
  productRequestItems: true,
}) satisfies z.Schema<Prisma.ProductRequestUpdateInput>;

export class UpdateOrderRequestDto extends createZodDto(
  UpdateOrderRequestSchema,
) {}
