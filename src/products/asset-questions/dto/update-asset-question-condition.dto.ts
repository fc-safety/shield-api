import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateAssetQuestionConditionSchema } from './create-asset-question-condition.dto';

const UpdateAssetQuestionConditionSchema =
  CreateAssetQuestionConditionSchema.partial() satisfies z.Schema<Prisma.AssetQuestionConditionUpdateInput>;

export class UpdateAssetQuestionConditionDto extends createZodDto(
  UpdateAssetQuestionConditionSchema,
) {}
