import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryTaskStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListTasksDto } from './dto/list-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusAdminDto } from './dto/update-task-status.dto';

@Injectable()
export class AdminTasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(params: ListTasksDto) {
    const { status, courierId, page = 1, limit = 20 } = params;
    const where: Prisma.DeliveryTaskWhereInput = {
      status: status ?? undefined,
      courierId: courierId ?? undefined,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deliveryTask.findMany({
        where,
        include: {
          courier: { include: { user: true } },
          order: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deliveryTask.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async getById(id: string) {
    const task = await this.prisma.deliveryTask.findUnique({
      where: { id },
      include: {
        courier: { include: { user: true } },
        events: { orderBy: { createdAt: 'desc' } },
        order: true,
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async assign(dto: AssignTaskDto) {
    const task = await this.prisma.deliveryTask.findUnique({ where: { id: dto.taskId } });
    if (!task) throw new NotFoundException('Task not found');

    let courierId = dto.courierId;
    if (!courierId && dto.userId) {
      const courier = await this.prisma.courier.findUnique({ where: { userId: dto.userId } });
      if (!courier) throw new BadRequestException('Courier profile not found for user');
      courierId = courier.id;
    }

    if (!courierId) {
      throw new BadRequestException('courierId or userId is required');
    }

    const updated = await this.prisma.deliveryTask.update({
      where: { id: dto.taskId },
      data: { courierId, status: DeliveryTaskStatus.ASSIGNED },
    });

    await this.prisma.taskEvent.create({
      data: {
        taskId: dto.taskId,
        status: DeliveryTaskStatus.ASSIGNED,
        note: 'Assigned by admin',
      },
    });

    return updated;
  }

  async updateStatus(taskId: string, dto: UpdateTaskStatusAdminDto) {
    const task = await this.prisma.deliveryTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const updated = await this.prisma.deliveryTask.update({
      where: { id: taskId },
      data: { status: dto.status },
    });

    await this.prisma.taskEvent.create({
      data: { taskId, status: dto.status, note: dto.note },
    });

    await this.prisma.order.update({
      where: { id: task.orderId },
      data: this.mapStatusToOrderUpdate(dto.status),
    });

    return updated;
  }

  private mapStatusToOrderUpdate(status: DeliveryTaskStatus): Prisma.OrderUpdateInput {
    if (status === DeliveryTaskStatus.DELIVERED) {
      return { status: 'DELIVERED' };
    }
    if (status === DeliveryTaskStatus.FAILED) {
      return { status: 'CANCELED' };
    }
    return {};
  }
}
