import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { NotificationsService, NOTIFICATION_PROVIDER_TOKEN } from './notifications.service';
import { NotificationProvider, NOTIFICATION_JOB, NOTIFICATIONS_QUEUE } from './notification.types';

class MockProvider implements NotificationProvider {
  name = 'mock';
  sent: { channel: string; to: string }[] = [];
  async send(channel: any, payload: any): Promise<void> {
    this.sent.push({ channel, to: payload.to });
  }
}

describe('NotificationsService', () => {
  it('forwards messages to the provider', async () => {
    const provider = new MockProvider();
    const queue = {
      name: NOTIFICATIONS_QUEUE,
      add: jest.fn(),
    } as unknown as Queue;
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NOTIFICATION_PROVIDER_TOKEN, useValue: provider },
        { provide: `BullQueue_${NOTIFICATIONS_QUEUE}`, useValue: queue },
      ],
    }).compile();

    const service = moduleRef.get(NotificationsService);
    await service.send('email', { to: 'test@example.com', subject: 'Hi', body: 'Hello' });

    expect(queue.add).toHaveBeenCalledWith(NOTIFICATION_JOB, {
      channel: 'email',
      payload: { to: 'test@example.com', subject: 'Hi', body: 'Hello' },
    });

    await service.sendImmediately('push', { to: 'user', body: 'Hi' });

    expect(provider.sent).toHaveLength(1);
    expect(provider.sent[0]).toEqual({ channel: 'push', to: 'user' });
  });
});
