import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  emitOrderUpdate(orderId: string, payload: Record<string, unknown>) {
    if (!orderId) return;
    this.gateway.server?.to(`order:${orderId}`).emit('order_update', payload);
    this.logger.debug(`Emitted order update for ${orderId}`);
  }

  emitTaskUpdate(taskId: string, payload: Record<string, unknown>) {
    if (!taskId) return;
    this.gateway.server?.to(`task:${taskId}`).emit('task_update', payload);
    this.logger.debug(`Emitted task update for ${taskId}`);
  }
}
