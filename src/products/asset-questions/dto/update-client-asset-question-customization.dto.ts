import { createZodDto } from 'nestjs-zod';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { createClientAssetQuestionCustomizationSchema } from './create-client-asset-question-customization.dto';

const updateClientAssetQuestionCustomizationSchema =
  createClientAssetQuestionCustomizationSchema.partial() satisfies z.ZodType<Prisma.ClientAssetQuestionCustomizationUpdateInput>;

export class UpdateClientAssetQuestionCustomizationDto extends createZodDto(
  updateClientAssetQuestionCustomizationSchema,
) {}
