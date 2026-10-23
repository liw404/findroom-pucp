export interface NotificationPayload {
  recipientEmail: string;
  subject: string;
  message: string;
  eventType: string;
}

export interface INotificationPort {
  sendNotification(payload: NotificationPayload): Promise<void>;
}
