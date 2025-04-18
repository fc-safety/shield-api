import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const BaseCannedReportsQuerySchema = z.object({});

export class BaseCannedReportsQueryDto extends createZodDto(
  BaseCannedReportsQuerySchema,
) {}
