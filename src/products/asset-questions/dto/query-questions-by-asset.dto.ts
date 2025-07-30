import { createZodDto } from 'nestjs-zod';
import { AssetQuestionType } from 'src/generated/prisma/client';
import { z } from 'zod';

export const QueryQuestionsByAssetSchema = z.object({
  type: z.nativeEnum(AssetQuestionType).optional(),
});

export class QueryQuestionsByAssetDto extends createZodDto(
  QueryQuestionsByAssetSchema,
) {}
