import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateProductRequestSchema } from './create-product-request.dto';

const UpdateProductRequestSchema = CreateProductRequestSchema.pick({
  productRequestItems: true,
}) satisfies z.Schema<Prisma.ProductRequestUpdateInput>;

export class UpdateProductRequestDto extends createZodDto(
  UpdateProductRequestSchema,
) {}
