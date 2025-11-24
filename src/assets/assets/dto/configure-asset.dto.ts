import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ImagesValueSchema = z.object({
  urls: z.array(z.string()),
});

export const ConfigureAssetSchema = z.object({
  responses: z.array(
    z.object({
      value: z.union([z.string(), z.number(), ImagesValueSchema]),
      assetQuestionId: z.string().nonempty(),
    }),
  ),
});

export class ConfigureAssetDto extends createZodDto(ConfigureAssetSchema) {}
