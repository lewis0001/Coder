import { NotFoundException } from '@nestjs/common';
import { AdminRestaurantsService } from './admin.restaurants.service';
import { PrismaService } from '../prisma/prisma.service';

const restaurantRecord = {
  id: 'rest-1',
  name: 'Test Kitchen',
  description: 'desc',
  address: '123 Street',
  regionId: 'region-1',
  latitude: 0,
  longitude: 0,
};

describe('AdminRestaurantsService', () => {
  let service: AdminRestaurantsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      restaurant: {
        findMany: jest.fn().mockResolvedValue([restaurantRecord]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(restaurantRecord),
        create: jest.fn().mockResolvedValue(restaurantRecord),
        update: jest.fn().mockResolvedValue(restaurantRecord),
      },
      restaurantCuisine: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      cuisine: { findUnique: jest.fn(), create: jest.fn() },
      menuCategory: {
        create: jest.fn().mockResolvedValue({ id: 'cat-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'cat-1', restaurantId: 'rest-1' }),
        update: jest.fn().mockResolvedValue({ id: 'cat-1', name: 'Updated' }),
      },
      menuItem: {
        create: jest.fn().mockResolvedValue({ id: 'item-1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'item-1', categoryId: 'cat-1' }),
        update: jest.fn().mockResolvedValue({ id: 'item-1', name: 'Updated' }),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    prisma.$transaction.mockImplementation(async (ops) => {
      const results = [] as unknown[];
      for (const op of ops as unknown as (() => unknown)[]) {
        // @ts-expect-error dynamic execution
        results.push(await op);
      }
      return results as any;
    });

    service = new AdminRestaurantsService(prisma);
  });

  it('lists restaurants with pagination', async () => {
    const result = await service.list({ page: 1, limit: 10 });
    expect(prisma.restaurant.findMany).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('gets restaurant by id or throws', async () => {
    const res = await service.getById('rest-1');
    expect(res.id).toBe('rest-1');

    prisma.restaurant.findUnique.mockResolvedValueOnce(null);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates restaurant with cuisines', async () => {
    const data = {
      name: 'New',
      address: '123',
      cuisines: ['Pizza'],
    } as any;
    await service.create(data);
    expect(prisma.restaurant.create).toHaveBeenCalled();
  });

  it('updates restaurant and replaces cuisines', async () => {
    await service.update('rest-1', { cuisines: ['Sushi'] });
    expect(prisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: 'rest-1' },
      data: {
        name: undefined,
        description: undefined,
        address: undefined,
        regionId: undefined,
        latitude: undefined,
        longitude: undefined,
      },
    });
    expect(prisma.restaurantCuisine.deleteMany).toHaveBeenCalled();
  });

  it('creates and updates menu categories', async () => {
    const created = await service.createCategory('rest-1', { name: 'Mains' });
    expect(created.id).toBe('cat-1');

    const updated = await service.updateCategory('cat-1', { name: 'Updated' });
    expect(updated.name).toBe('Updated');

    prisma.menuCategory.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateCategory('missing', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates and updates menu items', async () => {
    const created = await service.createMenuItem('cat-1', { name: 'Burger', price: 10 } as any);
    expect(created.id).toBe('item-1');

    const updated = await service.updateMenuItem('item-1', { price: 12 });
    expect(updated.id).toBe('item-1');

    prisma.menuItem.findUnique.mockResolvedValueOnce(null);
    await expect(service.updateMenuItem('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
