import * as Sentry from '@sentry/nestjs';

// Initialize Sentry for error tracking and monitoring
Sentry.init({
  // DSN (Data Source Name) - identifies which Sentry project to send events to
  // This should be configured via environment variable to support different environments
  dsn: process.env.SENTRY_DSN,

  // Environment identifier for this deployment (dev/staging/production)
  environment: process.env.SENTRY_ENVIRONMENT ?? 'local',

  // Send PII (Personally Identifiable Information) with error reports
  // This includes IP addresses and potentially user information from context
  // Enabled to help with debugging and correlating errors with specific users/sessions
  // Ensure this complies with your privacy policy and data protection requirements
  sendDefaultPii: true,
});

// Warn if Sentry is not configured in production
if (!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
  console.warn(
    'SENTRY_DSN environment variable not set - error tracking is disabled',
  );
}
