import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://eb6b74337b6655d78417b881cd519d9c@o4510505981116416.ingest.us.sentry.io/4510506176479232',
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'local',
});
