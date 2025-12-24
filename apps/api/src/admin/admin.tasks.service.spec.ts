import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeliveryTaskStatus } from '@prisma/client';
import { AdminTasksService } from './admin.tasks.service';
import { PrismaService } from '../prisma/prisma.service';

const task = { id: 'task-1', orderId: 'order-1', courierId: null } as any;
const courier = { id: 'courier-1', userId: 'user-1' } as any;

describe('AdminTasksService', () => {
  let service: AdminTasksService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      deliveryTask: {
        findMany: jest.fn().mockResolvedValue([task]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(task),
        update: jest.fn().mockResolvedValue({ ...task, status: DeliveryTaskStatus.ASSIGNED }),
      },
      courier: {
        findUnique: jest.fn().mockResolvedValue(courier),
      },
      taskEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      order: {
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    prisma.$transaction.mockImplementation(async (ops) => {
      const results = [] as unknown[];
      for (const op of ops as any[]) {
        // @ts-expect-error dynamic
        results.push(await op);
      }
      return results as any;
    });

    service = new AdminTasksService(prisma);
  });

  it('lists tasks with pagination', async () => {
    const result = await service.list({ page: 1, limit: 10 });
    expect(prisma.deliveryTask.findMany).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
  });

  it('gets task by id or throws', async () => {
    const res = await service.getById('task-1');
    expect(res.id).toBe('task-1');
    prisma.deliveryTask.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assigns task with courier user lookup', async () => {
    await service.assign({ taskId: 'task-1', userId: courier.userId });
    expect(prisma.deliveryTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: { courierId: courier.id, status: DeliveryTaskStatus.ASSIGNED },
    });
  });

  it('rejects assignment without courier', async () => {
    await expect(service.assign({ taskId: 'task-1' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates status and writes event', async () => {
    await service.updateStatus('task-1', { status: DeliveryTaskStatus.DELIVERED });
    expect(prisma.taskEvent.create).toHaveBeenCalled();
    expect(prisma.order.update).toHaveBeenCalled();
  });
});
