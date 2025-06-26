import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const GetClientStatusSchema = z
  .object({
    clientId: z
      .string()
      .optional()
      .describe('The ID of the client to get the status for.'),
    legacyUsername: z
      .string()
      .optional()
      .describe('The legacy username of the person to get the status for.'),
  })
  .superRefine((data, ctx) => {
    if (!data.clientId && !data.legacyUsername) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either clientId or legacyUsername is required.',
      });
    }
  });

export class GetClientStatusDto extends createZodDto(GetClientStatusSchema) {}
