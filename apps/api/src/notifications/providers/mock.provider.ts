import { Logger } from '@nestjs/common';
import { NotificationChannel, NotificationPayload, NotificationProvider } from '../notification.types';

export class MockNotificationProvider implements NotificationProvider {
  name = 'mock';
  private readonly logger = new Logger(MockNotificationProvider.name);

  async send(channel: NotificationChannel, payload: NotificationPayload): Promise<void> {
    this.logger.log(
      `[${channel}] to=${payload.to} subject=${payload.subject ?? ''} body=${payload.body} meta=${JSON.stringify(
        payload.metadata ?? {},
      )}`,
    );
  }
}
