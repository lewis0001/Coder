import { NotFoundException } from '@nestjs/common';
import { AdminStoresService } from './admin.stores.service';
import { PrismaService } from '../prisma/prisma.service';

const storeRecord = {
  id: 'store-1',
  name: 'Orbit Mart',
  description: 'desc',
  address: '123',
  regionId: 'region-1',
  latitude: 0,
  longitude: 0,
};

const categoryRecord = { id: 'cat-1', storeId: 'store-1', name: 'Pantry', sortOrder: 0 };
const productRecord = {
  id: 'prod-1',
  storeId: 'store-1',
  categoryId: 'cat-1',
  name: 'Item',
  description: 'desc',
  basePrice: 10,
  isActive: true,
};

const variantRecord = { id: 'var-1', productId: 'prod-1', name: 'Default', price: 10, sku: 'SKU-1' };
const inventoryRecord = { productId: 'prod-1', quantity: 5 };

describe('AdminStoresService', () => {
  let service: AdminStoresService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      store: {
        findMany: jest.fn().mockResolvedValue([storeRecord]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(storeRecord),
        create: jest.fn().mockResolvedValue(storeRecord),
        update: jest.fn().mockResolvedValue(storeRecord),
      },
      productCategory: {
        create: jest.fn().mockResolvedValue(categoryRecord),
        findUnique: jest.fn().mockResolvedValue(categoryRecord),
        update: jest.fn().mockResolvedValue({ ...categoryRecord, name: 'Updated' }),
      },
      product: {
        create: jest.fn().mockResolvedValue(productRecord as any),
        findUnique: jest.fn().mockResolvedValue(productRecord as any),
        update: jest.fn().mockResolvedValue({ ...productRecord, name: 'Updated' } as any),
      },
      productVariant: {
        create: jest.fn().mockResolvedValue(variantRecord as any),
        findUnique: jest.fn().mockResolvedValue(variantRecord as any),
        update: jest.fn().mockResolvedValue({ ...variantRecord, name: 'Updated' } as any),
      },
      inventory: {
        upsert: jest.fn().mockResolvedValue(inventoryRecord as any),
        update: jest.fn().mockResolvedValue({ productId: 'prod-1', quantity: 10 }),
        create: jest.fn().mockResolvedValue({ productId: 'prod-1', quantity: 10 }),
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

    service = new AdminStoresService(prisma);
  });

  it('lists stores with pagination', async () => {
    const result = await service.list({ page: 1, limit: 10 });
    expect(prisma.store.findMany).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('gets a store by id or throws', async () => {
    const res = await service.getById('store-1');
    expect(res.id).toBe('store-1');

    prisma.store.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.getById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a store', async () => {
    await service.create({ name: 'New', address: 'A', regionId: 'region-1' } as any);
    expect(prisma.store.create).toHaveBeenCalled();
  });

  it('updates a store', async () => {
    await service.update('store-1', { name: 'Updated' });
    expect(prisma.store.update).toHaveBeenCalled();
  });

  it('creates and updates categories', async () => {
    const created = await service.createCategory('store-1', { name: 'Pantry' });
    expect(created.id).toBe('cat-1');

    const updated = await service.updateCategory('cat-1', { name: 'Updated' });
    expect(updated.name).toBe('Updated');

    prisma.productCategory.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.updateCategory('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates and updates products', async () => {
    const created = await service.createProduct('cat-1', { name: 'Item', basePrice: 9.5 } as any);
    expect(created.id).toBe('prod-1');

    const updated = await service.updateProduct('prod-1', { name: 'Updated' });
    expect(updated.name).toBe('Updated');

    prisma.product.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.updateProduct('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates and updates variants', async () => {
    const created = await service.createVariant('prod-1', { name: 'Size', price: 12 });
    expect(created.id).toBe('var-1');

    const updated = await service.updateVariant('var-1', { price: 15 });
    expect(updated.id).toBe('var-1');

    prisma.productVariant.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.updateVariant('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates inventory or creates when missing', async () => {
    await service.updateInventory('prod-1', { quantity: 10 });
    expect(prisma.inventory.update).toHaveBeenCalled();
  });

  it('throws when updating missing inventory product', async () => {
    prisma.product.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.updateInventory('missing', { quantity: 1 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
