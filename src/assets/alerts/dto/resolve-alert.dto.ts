import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';

const ResolveAlertSchema = z.object({
  resolutionNote: z.string().nonempty(),
}) satisfies z.Schema<Prisma.AlertUpdateInput>;

export class ResolveAlertDto extends createZodDto(ResolveAlertSchema) {}
