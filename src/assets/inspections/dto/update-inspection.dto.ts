import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const UpdateInspectionSchema = z.object({
  status: z.enum(['COMPLETE']),
}) satisfies z.Schema<Prisma.InspectionUpdateInput>;

export class UpdateInspectionDto extends createZodDto(UpdateInspectionSchema) {}
