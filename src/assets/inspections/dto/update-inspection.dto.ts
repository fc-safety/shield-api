import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const UpdateInspectionSchema = z.object({
  status: z.enum(['COMPLETE']),
}) satisfies z.Schema<Prisma.InspectionUpdateInput>;

export class UpdateInspectionDto extends createZodDto(UpdateInspectionSchema) {}
