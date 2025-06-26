import { z } from 'zod';

export type WsPrompt = <
  Schema extends z.ZodSchema<any> | undefined = undefined,
>(
  message: any,
  options?: {
    schema?: Schema;
  },
) => Promise<
  Schema extends z.ZodSchema<any> ? z.infer<NonNullable<Schema>> : any
>;
