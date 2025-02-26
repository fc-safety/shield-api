import { z } from 'zod';

export const configSchema = z.object({
  // GENERAL
  PORT: z.coerce.number().optional().default(3000),
  FRONTEND_URL: z.string(),
  // AUTH
  AUTH_JWKS_URI: z.string(),
  AUTH_ISSUER: z.string(),
  AUTH_AUDIENCE: z.string(),

  // KEYCLOAK ADMIN CLIENT
  KEYCLOAK_ADMIN_CLIENT_ADMIN_REALM: z.string().default('master'),
  KEYCLOAK_ADMIN_CLIENT_DEFAULT_REALM: z.string().default('shield'),
  KEYCLOAK_ADMIN_CLIENT_BASE_URL: z.string(),
  KEYCLOAK_ADMIN_CLIENT_CLIENT_ID: z.string(),
  KEYCLOAK_ADMIN_CLIENT_CLIENT_SECRET: z.string(),
  KEYCLOAK_ADMIN_CLIENT_REFRESH_INTERVAL_SECONDS: z.coerce.number().default(58),

  // CORS
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((val) => val.split(',')),

  // Email - Resend
  RESEND_API_KEY: z.string(),
});

export type Config = z.infer<typeof configSchema>;
