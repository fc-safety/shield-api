export interface ClientNotificationJobData {
  clientId: string;
  dateBucket?: string;
}

export interface SendNewProductRequestEmailJobData {
  productRequestId: string;
}

export interface SendInspectionAlertTriggeredEmailJobData {
  alertId: string;
}
