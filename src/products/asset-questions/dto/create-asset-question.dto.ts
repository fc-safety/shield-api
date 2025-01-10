import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const CreateAssetQuestionSchema = z.object({
  active: z.boolean().default(true),
  type: z.enum(['SETUP', 'INSPECTION']),
  required: z.boolean().default(false),
  order: z.number().optional(),
  prompt: z.string().nonempty(),
  valueType: z.enum([
    'BINARY',
    'INDETERMINATE_BINARY',
    'TEXT',
    'TEXTAREA',
    'DATE',
    'NUMBER',
    'IMAGE',
  ]),
}) satisfies z.Schema<Prisma.AssetQuestionCreateInput>;

export class CreateAssetQuestionDto extends createZodDto(
  CreateAssetQuestionSchema,
) {}
