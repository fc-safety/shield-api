// QUEUE PROVIDERS AND PROCESSORS
export const QUEUE_PREFIX = '{shield-notifications}';

export const QUEUE_NAMES = {
  SEND_NOTIFICATIONS: 'send-notifications',
  CLIENT_NOTIFICATIONS: 'client-notifications',
};

export const CLIENT_NOTIFICATIONS_JOB_NAMES = {
  PROCESS_CLIENT_INSPECTION_REMINDERS: 'process-client-inspection-reminders',
  PROCESS_CLIENT_MONTHLY_INSPECTION_REPORTS:
    'process-client-monthly-inspection-reports',
  SEND_EMAIL: 'send-email',
};

export const NOTIFICATIONS_JOB_NAMES = {
  SEND_NEW_PRODUCT_REQUEST_EMAIL: 'send-new-product-request-email',
};

// TEMPLATES
export const FONT_AWESOME_VERSION = '6.7.2';
