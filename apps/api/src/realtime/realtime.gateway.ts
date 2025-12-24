import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AuthPayload } from '../auth/types/auth-response';

interface OrbitSocket extends Socket {
  user?: AuthPayload;
}

@WebSocketGateway({ namespace: '/realtime', cors: true })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  async handleConnection(client: OrbitSocket) {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn('Socket connection rejected: missing token');
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<AuthPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      client.user = payload;
      this.logger.log(`Socket connected for user ${payload.sub}`);
    } catch (error) {
      this.logger.warn(`Socket connection rejected: invalid token (${error})`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: OrbitSocket) {
    const userId = client.user?.sub ?? 'unknown';
    this.logger.log(`Socket disconnected for user ${userId}`);
  }

  @SubscribeMessage('subscribe_order')
  handleOrderSubscribe(client: OrbitSocket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return;
    client.join(`order:${data.orderId}`);
    this.logger.debug(`User ${client.user?.sub} subscribed to order ${data.orderId}`);
  }

  @SubscribeMessage('subscribe_task')
  handleTaskSubscribe(client: OrbitSocket, @MessageBody() data: { taskId: string }) {
    if (!data?.taskId) return;
    client.join(`task:${data.taskId}`);
    this.logger.debug(`User ${client.user?.sub} subscribed to task ${data.taskId}`);
  }

  private extractToken(client: OrbitSocket): string | undefined {
    const header = client.handshake.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    return typeof token === 'string' ? token : undefined;
  }
}
