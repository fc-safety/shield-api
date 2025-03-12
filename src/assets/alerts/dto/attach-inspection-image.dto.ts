import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const AttachInspectionImageSchema = z.object({
  inspectionImageUrl: z.string().nonempty(),
}) satisfies z.Schema<Prisma.AlertUpdateInput>;

export class AttachInspectionImageDto extends createZodDto(
  AttachInspectionImageSchema,
) {}
