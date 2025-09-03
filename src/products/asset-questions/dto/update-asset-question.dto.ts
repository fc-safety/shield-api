import { createZodDto } from 'nestjs-zod';
import { CreateRegulatoryCodeSchema } from 'src/common/schema';
import { Prisma } from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateAssetQuestionConditionSchema } from './create-asset-question-condition.dto';
import {
  BaseCreateAssetQuestionSchema,
  CreateAssetAlertCriterionSchema,
  CreateAssetQuestionSchema,
  CreateConsumableConfigSchema,
  CreateSetAssetMetadataConfigSchema,
} from './create-asset-question.dto';

const UpdateAssetQuestionSchema = CreateAssetQuestionSchema.extend({
  conditions: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetQuestionConditionSchema),
      }),
      updateMany: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: CreateAssetQuestionConditionSchema.partial(),
        }),
      ),
      deleteMany: z.array(z.object({ id: z.string() })),
    })
    .partial(),
  assetAlertCriteria: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetAlertCriterionSchema),
      }),
      updateMany: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: CreateAssetAlertCriterionSchema.partial(),
        }),
      ),
      deleteMany: z.array(z.object({ id: z.string() })),
    })
    .partial(),
  consumableConfig: z
    .object({
      create: CreateConsumableConfigSchema,
      update: CreateConsumableConfigSchema.partial(),
      delete: z.boolean().default(false),
    })
    .partial(),
  variants: z.object({
    createMany: z.object({
      data: z.array(BaseCreateAssetQuestionSchema),
    }),
    updateMany: z.array(
      z.object({
        where: z.object({ id: z.string() }),
        data: BaseCreateAssetQuestionSchema.partial(),
      }),
    ),
    deleteMany: z.array(z.object({ id: z.string() })),
  }),
  setAssetMetadataConfig: z
    .object({
      create: CreateSetAssetMetadataConfigSchema,
      update: CreateSetAssetMetadataConfigSchema,
      delete: z.boolean().default(false),
    })
    .partial(),
  files: z
    .object({
      createMany: z.object({
        data: z.array(
          z.object({
            name: z.string(),
            url: z.string(),
          }),
        ),
      }),
      updateMany: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: z.object({
            name: z.string(),
            url: z.string(),
          }),
        }),
      ),
      deleteMany: z.array(z.object({ id: z.string() })),
    })
    .partial(),
  regulatoryCodes: z
    .object({
      create: z.array(CreateRegulatoryCodeSchema),
      update: z.array(
        z.object({
          where: z.object({ id: z.string() }),
          data: CreateRegulatoryCodeSchema.partial(),
        }),
      ),
      delete: z.array(z.object({ id: z.string() })),
    })
    .partial(),
}).partial() satisfies z.Schema<Prisma.AssetQuestionUpdateInput>;

export class UpdateAssetQuestionDto extends createZodDto(
  UpdateAssetQuestionSchema,
) {}
