import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  const toMock = jest.fn().mockReturnValue({ emit: jest.fn() });
  const gatewayMock = { server: { to: toMock } } as any;
  const service = new RealtimeService(gatewayMock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('emits order updates to room', () => {
    service.emitOrderUpdate('order-1', { status: 'on_the_way' });
    expect(toMock).toHaveBeenCalledWith('order:order-1');
  });

  it('emits task updates to room', () => {
    service.emitTaskUpdate('task-1', { status: 'picked_up' });
    expect(toMock).toHaveBeenCalledWith('task:task-1');
  });

  it('safely no-ops without id', () => {
    service.emitOrderUpdate('', { status: 'noop' });
    expect(toMock).not.toHaveBeenCalled();
  });
});
