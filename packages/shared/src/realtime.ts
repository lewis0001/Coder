import { io, Socket, SocketOptions } from 'socket.io-client';

export type RealtimeSubscribePayload = {
  orderId?: string;
  taskId?: string;
};

export type RealtimeClientOptions = {
  /** API base URL, e.g., http://localhost:3001 */
  baseUrl: string;
  /** Function that returns the latest bearer token for auth. */
  getToken: () => string | Promise<string> | undefined;
  /** Additional socket.io options. */
  socketOptions?: Partial<SocketOptions>;
  /** Optional logger for connection lifecycle. */
  logger?: Pick<Console, 'info' | 'error' | 'warn' | 'debug'>;
};

export interface RealtimeClient {
  socket: Socket;
  subscribeToOrder: (orderId: string) => void;
  subscribeToTask: (taskId: string) => void;
  disconnect: () => void;
}

function buildAuth(getToken: RealtimeClientOptions['getToken']) {
  return async () => {
    const token = await getToken();
    if (!token) return {};
    return {
      auth: { token },
      extraHeaders: { Authorization: `Bearer ${token}` },
    };
  };
}

export async function createRealtimeClient(options: RealtimeClientOptions): Promise<RealtimeClient> {
  const { baseUrl, socketOptions, logger } = options;
  const resolveAuth = buildAuth(options.getToken);
  const auth = await resolveAuth();

  const socket = io(baseUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
    ...auth,
    ...socketOptions,
    extraHeaders: {
      ...(auth as any).extraHeaders,
      ...(socketOptions?.extraHeaders ?? {}),
    },
  });

  socket.on('connect', () => logger?.info?.(`Realtime connected (${socket.id})`));
  socket.on('disconnect', (reason) => logger?.warn?.(`Realtime disconnected: ${reason}`));
  socket.on('connect_error', (err) => logger?.error?.(`Realtime error: ${err}`));

  const subscribeToOrder = (orderId: string) => {
    if (!orderId) return;
    socket.emit('subscribe_order', { orderId });
  };

  const subscribeToTask = (taskId: string) => {
    if (!taskId) return;
    socket.emit('subscribe_task', { taskId });
  };

  const disconnect = () => socket.disconnect();

  return { socket, subscribeToOrder, subscribeToTask, disconnect };
}
