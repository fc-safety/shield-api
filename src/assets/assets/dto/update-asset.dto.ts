import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CreateAssetSchema } from './create-asset.dto';

export class UpdateAssetDto extends createZodDto(
  CreateAssetSchema.partial().extend({
    active: z.boolean().optional(), // remove default value (https://zod.dev/v4/changelog?id=defaults-applied-within-optional-fields)
  }),
) {}
