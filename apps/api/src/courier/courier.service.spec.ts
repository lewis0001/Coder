import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryTaskStatus } from '@prisma/client';
import { CourierService } from './courier.service';
import { PrismaService } from '../prisma/prisma.service';

const courier = { id: 'courier-1', userId: 'user-1' } as any;
const task = { id: 'task-1', orderId: 'order-1', courierId: null } as any;

describe('CourierService', () => {
  let service: CourierService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      courier: {
        findUnique: jest.fn().mockResolvedValue(courier),
        create: jest.fn().mockResolvedValue(courier),
        update: jest.fn().mockResolvedValue({ ...courier, online: true }),
      },
      courierShift: {
        create: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      courierLocation: {
        create: jest.fn().mockResolvedValue({}),
      },
      deliveryTask: {
        findUnique: jest.fn().mockResolvedValue(task),
        update: jest.fn().mockResolvedValue({ ...task, courierId: courier.id }),
      },
      taskEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      order: {
        update: jest.fn().mockResolvedValue({}),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new CourierService(prisma);
  });

  it('toggles online and creates shift', async () => {
    const res = await service.toggleOnline('user-1', true);
    expect(prisma.courierShift.create).toHaveBeenCalled();
    expect(res.online).toBe(true);
  });

  it('records location', async () => {
    await service.recordLocation('user-1', { latitude: 1, longitude: 2 });
    expect(prisma.courierLocation.create).toHaveBeenCalled();
  });

  it('accepts task', async () => {
    await service.acceptTask('user-1', 'task-1');
    expect(prisma.deliveryTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { courierId: courier.id, status: DeliveryTaskStatus.ASSIGNED },
    });
  });

  it('prevents accepting assigned task', async () => {
    prisma.deliveryTask.findUnique.mockResolvedValueOnce({ ...task, courierId: 'other' } as any);
    await expect(service.acceptTask('user-1', 'task-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updates task status and adds event', async () => {
    await service.updateTaskStatus('user-1', 'task-1', { status: DeliveryTaskStatus.PICKED_UP });
    expect(prisma.taskEvent.create).toHaveBeenCalledWith({
      data: {
        taskId: 'task-1',
        status: DeliveryTaskStatus.PICKED_UP,
        note: undefined,
      },
    });
  });

  it('throws for missing task', async () => {
    prisma.deliveryTask.findUnique.mockResolvedValueOnce(null as any);
    await expect(
      service.updateTaskStatus('user-1', 'missing', { status: DeliveryTaskStatus.PICKED_UP }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
