import { createAddressSchema } from 'src/common/schema';
import { z } from 'zod';

export const addressValueSchema = z.object({
  value: createAddressSchema,
});

export const stringValueSchema = z.object({
  value: z.string(),
});

export const numberValueSchema = z.object({
  value: z.coerce.number(),
});

export const booleanValueSchema = z.object({
  value: z.boolean(),
});
