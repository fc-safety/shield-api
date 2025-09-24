import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { QueryQuestionsByAssetSchema } from './query-questions-by-asset.dto';

export const QueryQuestionsByAssetPropertiesSchema =
  QueryQuestionsByAssetSchema.extend({
    siteId: z.string(),
    productId: z.string(),
  });

export class QueryQuestionsByAssetPropertiesDto extends createZodDto(
  QueryQuestionsByAssetPropertiesSchema,
) {}
