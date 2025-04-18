import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const AttachInspectionImageSchema = z.object({
  inspectionImageUrl: z.string().nonempty(),
}) satisfies z.Schema<Prisma.AlertUpdateInput>;

export class AttachInspectionImageDto extends createZodDto(
  AttachInspectionImageSchema,
) {}
