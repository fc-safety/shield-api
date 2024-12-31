import { z } from 'zod';

export const configSchema = z.object({
  // GENERAL
  PORT: z.coerce.number().optional().default(3000),

  // AUTH
  AUTH_JWKS_URI: z.string(),
  AUTH_ISSUER: z.string(),
  AUTH_AUDIENCE: z.string(),
});

export type Config = z.infer<typeof configSchema>;
