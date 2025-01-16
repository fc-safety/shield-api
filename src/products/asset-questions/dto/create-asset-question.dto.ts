import { Prisma } from '@prisma/client';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  alertLevel: z.enum(['URGENT', 'INFO']),
});

export const CreateAssetQuestionSchema = z.object({
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
  assetAlertCriteria: z
    .object({
      createMany: z.object({
        data: z.array(CreateAssetAlertCriterionSchema),
      }),
    })
    .partial()
    .optional(),
}) satisfies z.Schema<Prisma.AssetQuestionCreateInput>;

export class CreateAssetQuestionDto extends createZodDto(
  CreateAssetQuestionSchema,
) {}
