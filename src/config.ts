import { z } from 'zod';
import { isNil } from './common/utils';

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

  // SMS - Telnyx
  TELNYX_API_KEY: z.string(),
  TELNYX_PHONE_NUMBER: z.string(),

  // Redis/ValKey Store
  KV_STORE_HOST: z.string().default('localhost'),
  KV_STORE_PORT: z.coerce.number().default(6379),
  KV_STORE_CONNECT_TIMEOUT: z.coerce.number().default(5000),

  // Cloudflare Turnstile
  CLOUDFLARE_TURNSTILE_SECRET_KEY_SHIELD_LANDING: z.string(),

  // Signing
  DEFAULT_SIGNING_KEY_ID: z.string(),

  // Shield Landing
  BCC_LEAD_FORM_SUBMISSION_EMAILS: z
    .string()
    .optional()
    .transform((v) => (isNil(v) ? [] : v.split(','))),

  // Help Scout Support
  HELPSCOUT_BEACON_SECRET_KEY: z.string(),

  // M2M API Keys
  M2M_API_KEYS: z
    .string()
    .default('')
    .transform((v) => v.split(',').filter(Boolean)),
});

export type Config = z.infer<typeof configSchema>;
