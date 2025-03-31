export interface ClientNotificationJobData {
  clientId: string;
}

export interface SendEmailJobData {
  templateName: string;
  subject?: string;
  to: string[];
  templateProps?: Record<string, unknown>;
}

export interface SendNewProductRequestEmailJobData {
  productRequestId: string;
}
