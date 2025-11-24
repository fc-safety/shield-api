import { createZodDto } from 'nestjs-zod';
import { CreateRegulatoryCodeSchema } from 'src/common/schema';
import {
  AlertLevel,
  AssetQuestionResponseType,
  AssetQuestionType,
  ConsumableMappingType,
  Prisma,
} from 'src/generated/prisma/client';
import { z } from 'zod';
import { CreateAssetQuestionConditionSchema } from './create-asset-question-condition.dto';

const RuleClauseObjectSchema = z
  .object({
    empty: z.literal(true),
    notEmpty: z.literal(true),
    equals: z.string(),
    not: z.string(),
    contains: z.string(),
    notContains: z.string(),
    startsWith: z.string(),
    endsWith: z.string(),
    gt: z.union([z.string(), z.number()]),
    gte: z.union([z.string(), z.number()]),
    lt: z.union([z.string(), z.number()]),
    lte: z.union([z.string(), z.number()]),
    beforeDaysPast: z.number(),
    afterDaysPast: z.number(),
    beforeDaysFuture: z.number(),
    afterDaysFuture: z.number(),
  })
  .partial();

export const RuleClauseSchema = z.union([z.string(), RuleClauseObjectSchema]);

export const BaseCreateAssetAlertCriterionRuleSchema = z.object({
  value: RuleClauseSchema.optional(),
});

export type CreateAssetAlertCriterionRule = z.infer<
  typeof BaseCreateAssetAlertCriterionRuleSchema
> & {
  AND?: CreateAssetAlertCriterionRule[];
  OR?: CreateAssetAlertCriterionRule[];
};

export const CreateAssetAlertCriterionRuleSchema: z.ZodType<CreateAssetAlertCriterionRule> =
  BaseCreateAssetAlertCriterionRuleSchema.extend({
    AND: z.array(BaseCreateAssetAlertCriterionRuleSchema).optional(),
    OR: z.array(BaseCreateAssetAlertCriterionRuleSchema).optional(),
  });

export const CreateAssetAlertCriterionSchema = z.object({
  rule: CreateAssetAlertCriterionRuleSchema,
  alertLevel: z.enum(
    Object.values(AlertLevel) as [AlertLevel, ...AlertLevel[]],
  ),
  autoResolve: z.boolean().default(false),
});

export const CreateConsumableConfigSchema = z.object({
  consumableProduct: z.object({
    connect: z.object({
      id: z.string(),
    }),
  }),
  mappingType: z.enum(
    Object.values(ConsumableMappingType) as [
      ConsumableMappingType,
      ...ConsumableMappingType[],
    ],
  ),
}) satisfies z.Schema<Prisma.ConsumableQuestionConfigCreateInput>;

export const CreateSetAssetMetadataConfigSchema = z.object({
  metadata: z.array(
    z
      .object({
        key: z.string().nonempty(),
        type: z.enum(['DYNAMIC', 'STATIC']),
        value: z.string().optional(),
      })
      .refine(
        (data) =>
          data.type === 'STATIC' ? !!data.value && data.value !== '' : true,
        {
          message: 'Value is required for setting static metadata',
        },
      ),
  ),
}) satisfies z.Schema<Prisma.SetAssetMetadataConfigCreateInput>;

export const BaseCreateAssetQuestionSchema = z.object({
  legacyQuestionId: z.string().optional().nullable(),
  active: z.boolean().default(true),
  type: z.enum(
    Object.values(AssetQuestionType) as [
      AssetQuestionType,
      ...AssetQuestionType[],
    ],
  ),
  required: z.boolean().default(false),
  order: z.number().optional(),
  prompt: z.string().nonempty(),
  valueType: z.enum(
    Object.values(AssetQuestionResponseType) as [
      AssetQuestionResponseType,
      ...AssetQuestionResponseType[],
    ],
  ),
  selectOptions: z
    .array(
      z.object({
        value: z.string(),
        order: z.number().optional(),
        label: z.string().optional(),
      }),
    )
    .optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  tone: z.string().optional(),
  client: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  parentQuestion: z
    .object({
      connect: z.object({
        id: z.string(),
      }),
    })
    .optional(),
  conditions: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetQuestionConditionSchema),
      }),
    })
    .partial()
    .optional(),
  assetAlertCriteria: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetAlertCriterionSchema),
      }),
    })
    .partial()
    .optional(),
  consumableConfig: z
    .object({
      create: CreateConsumableConfigSchema,
    })
    .optional(),
  setAssetMetadataConfig: z
    .object({
      create: CreateSetAssetMetadataConfigSchema,
    })
    .optional(),
  files: z
    .object({
      createMany: z.object({
        data: z.array(
          z.object({
            name: z.string(),
            url: z.string().url(),
          }),
        ),
      }),
    })
    .partial()
    .optional(),
  regulatoryCodes: z
    .object({
      create: z.array(CreateRegulatoryCodeSchema),
    })
    .partial()
    .optional(),
}) satisfies z.Schema<Prisma.AssetQuestionCreateInput>;

export const CreateAssetQuestionSchema = BaseCreateAssetQuestionSchema.extend({
  variants: z
    .object({
      createMany: z.object({
        data: z.array(BaseCreateAssetQuestionSchema),
      }),
    })
    .optional(),
}) satisfies z.Schema<Prisma.AssetQuestionCreateInput>;

export class CreateAssetQuestionDto extends createZodDto(
  CreateAssetQuestionSchema,
) {}
