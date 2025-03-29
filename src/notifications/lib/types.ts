import { NotificationGroupId } from '../notification-types';

export interface ClientNotificationJobData {
  clientId: string;
}

export interface SendEmailJobData {
  notificationGroupId: NotificationGroupId;
  subject: string;
  to: string[];
  templateProps?: Record<string, unknown>;
}

export interface SendNewProductRequestEmailJobData {
  productRequestId: string;
}
