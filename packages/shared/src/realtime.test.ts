import { createRealtimeClient } from './realtime';

jest.mock('socket.io-client', () => {
  const emit = jest.fn();
  const on = jest.fn();
  const disconnect = jest.fn();
  return {
    io: jest.fn(() => ({ emit, on, disconnect })),
  };
});

describe('createRealtimeClient', () => {
  it('creates a client with bearer auth and exposes helpers', () => {
    const client = createRealtimeClient({
      apiUrl: 'http://localhost:3001',
      token: 'test-token',
    });

    expect(client.subscribeToOrder).toBeDefined();
    client.subscribeToOrder('order-123', jest.fn());
    client.emitStatus('task-1', { status: 'PICKED_UP' } as any);
    client.disconnect();
  });
});
