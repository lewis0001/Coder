import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationChannel, NotificationJobData, NOTIFICATIONS_QUEUE, NotificationProvider } from './notification.types';
import { NOTIFICATION_PROVIDER_TOKEN } from './notifications.service';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(@Inject(NOTIFICATION_PROVIDER_TOKEN) private readonly provider: NotificationProvider) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { channel, payload } = job.data;
    await this.provider.send(channel as NotificationChannel, payload);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData>, error: Error) {
    this.logger.error(`Notification job ${job.id} failed`, error.stack);
  }
}
