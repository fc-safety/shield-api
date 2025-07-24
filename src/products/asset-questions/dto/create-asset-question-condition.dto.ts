import { createZodDto } from 'nestjs-zod';
import {
  AssetQuestionConditionType,
  Prisma,
} from 'src/generated/prisma/client';
import { z } from 'zod';

export const CreateAssetQuestionConditionSchema = z.object({
  conditionType: z.enum(
    Object.values(AssetQuestionConditionType) as [
      AssetQuestionConditionType,
      ...AssetQuestionConditionType[],
    ],
  ),
  value: z.array(z.string()),
  description: z.string().optional().nullable(),
}) satisfies z.Schema<Prisma.AssetQuestionConditionCreateWithoutAssetQuestionInput>;

export class CreateAssetQuestionConditionDto extends createZodDto(
  CreateAssetQuestionConditionSchema,
) {}
