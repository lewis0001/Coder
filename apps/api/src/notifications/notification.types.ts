export const NOTIFICATIONS_QUEUE = 'notifications';
export const NOTIFICATION_JOB = 'send-notification';

export type NotificationChannel = 'email' | 'sms' | 'push';

export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  name: string;
  send(channel: NotificationChannel, payload: NotificationPayload): Promise<void>;
}

export interface NotificationJobData {
  channel: NotificationChannel;
  payload: NotificationPayload;
}
