import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService, NOTIFICATION_PROVIDER_TOKEN } from './notifications.service';
import { MockNotificationProvider } from './providers/mock.provider';
import { NotificationsProcessor } from './notifications.processor';
import { NOTIFICATIONS_QUEUE } from './notification.types';

@Module({
  imports: [BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    { provide: NOTIFICATION_PROVIDER_TOKEN, useClass: MockNotificationProvider },
  ],
  exports: [NotificationsService, BullModule],
})
export class NotificationsModule {}
