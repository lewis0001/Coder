import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryTaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class CourierService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleOnline(userId: string, online: boolean) {
    const courier = await this.ensureCourier(userId);

    if (online) {
      await this.prisma.courierShift.create({
        data: { courierId: courier.id },
      });
    } else {
      await this.prisma.courierShift.updateMany({
        where: { courierId: courier.id, endedAt: null },
        data: { endedAt: new Date() },
      });
    }

    const updated = await this.prisma.courier.update({
      where: { id: courier.id },
      data: { online },
    });

    return updated;
  }

  async recordLocation(userId: string, coords: UpdateLocationDto) {
    const courier = await this.ensureCourier(userId);
    return this.prisma.courierLocation.create({
      data: { courierId: courier.id, latitude: coords.latitude, longitude: coords.longitude },
    });
  }

  async acceptTask(userId: string, taskId: string) {
    const courier = await this.ensureCourier(userId);
    const task = await this.prisma.deliveryTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.courierId && task.courierId !== courier.id)
      throw new BadRequestException('Task already assigned');

    const updated = await this.prisma.deliveryTask.update({
      where: { id: taskId },
      data: { courierId: courier.id, status: DeliveryTaskStatus.ASSIGNED },
    });

    await this.prisma.taskEvent.create({
      data: { taskId, status: DeliveryTaskStatus.ASSIGNED, note: 'Courier accepted task' },
    });

    return updated;
  }

  async updateTaskStatus(userId: string, taskId: string, body: UpdateTaskStatusDto) {
    const courier = await this.ensureCourier(userId);
    const task = await this.prisma.deliveryTask.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.courierId && task.courierId !== courier.id)
      throw new BadRequestException('Task assigned to another courier');

    const allowed: DeliveryTaskStatus[] = [
      DeliveryTaskStatus.ASSIGNED,
      DeliveryTaskStatus.PICKED_UP,
      DeliveryTaskStatus.IN_TRANSIT,
      DeliveryTaskStatus.DELIVERED,
      DeliveryTaskStatus.FAILED,
    ];
    if (!allowed.includes(body.status)) {
      throw new BadRequestException('Invalid status');
    }

    const updated = await this.prisma.deliveryTask.update({
      where: { id: taskId },
      data: { status: body.status, courierId: task.courierId ?? courier.id },
    });

    await this.prisma.taskEvent.create({
      data: {
        taskId,
        status: body.status,
        note: body.note,
      },
    });

    if (body.status === DeliveryTaskStatus.DELIVERED) {
      await this.prisma.order.update({ where: { id: task.orderId }, data: { status: 'DELIVERED' } });
    } else if (body.status === DeliveryTaskStatus.FAILED) {
      await this.prisma.order.update({ where: { id: task.orderId }, data: { status: 'CANCELED' } });
    }

    return updated;
  }

  private async ensureCourier(userId: string) {
    const existing = await this.prisma.courier.findUnique({ where: { userId } });
    if (existing) return existing;
    return this.prisma.courier.create({
      data: { userId, online: false },
    });
  }
}
