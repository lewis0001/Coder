import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  NotificationChannel,
  NotificationJobData,
  NotificationPayload,
  NotificationProvider,
  NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
} from './notification.types';

const PROVIDER_TOKEN = 'NotificationProvider';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue<NotificationJobData>,
    @Inject(PROVIDER_TOKEN) private readonly provider: NotificationProvider,
  ) {}

  async send(channel: NotificationChannel, payload: NotificationPayload) {
    await this.queue.add(NOTIFICATION_JOB, { channel, payload });
  }

  async sendImmediately(channel: NotificationChannel, payload: NotificationPayload) {
    return this.provider.send(channel, payload);
  }
}

export { PROVIDER_TOKEN as NOTIFICATION_PROVIDER_TOKEN };
