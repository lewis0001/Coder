import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerService } from './partner.service';
import { Prisma } from '@prisma/client';

const store = { id: 'store-1', name: 'Test Store' } as any;
const partnerLink = { store } as any;
const product = { id: 'product-1', storeId: store.id } as any;
const variant = { id: 'variant-1', productId: product.id, product } as any;

describe('PartnerService', () => {
  let prisma: jest.Mocked<PrismaService>;
  let service: PartnerService;

  beforeEach(() => {
    prisma = {
      partnerStore: {
        findFirst: jest.fn().mockResolvedValue(partnerLink),
      },
      productCategory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue(product),
        update: jest.fn().mockResolvedValue(product),
      },
      productVariant: {
        findUnique: jest.fn().mockResolvedValue(variant),
        update: jest.fn().mockResolvedValue({ ...variant, name: 'New' }),
      },
      inventory: {
        upsert: jest.fn().mockResolvedValue({ productId: product.id, quantity: 10 }),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new PartnerService(prisma);
  });

  it('loads catalog for partner store', async () => {
    const res = await service.getCatalog('user-1');
    expect(prisma.partnerStore.findFirst).toHaveBeenCalled();
    expect(res.store.id).toBe(store.id);
  });

  it('updates product price and availability', async () => {
    await service.updateProduct('user-1', product.id, { price: 12.5, isActive: false });
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { basePrice: new Prisma.Decimal(12.5), isActive: false },
    });
  });

  it('rejects updates for other store products', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({ id: 'p2', storeId: 'other' } as any);
    await expect(service.updateProduct('user-1', 'p2', {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates variant when owned', async () => {
    await service.updateVariant('user-1', variant.id, { price: 9.5 });
    expect(prisma.productVariant.update).toHaveBeenCalled();
  });

  it('throws when variant missing', async () => {
    prisma.productVariant.findUnique.mockResolvedValueOnce(null as any);
    await expect(service.updateVariant('user-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates inventory via upsert', async () => {
    const res = await service.updateInventory('user-1', product.id, { quantity: 15 });
    expect(res.quantity).toBe(10);
    expect(prisma.inventory.upsert).toHaveBeenCalledWith({
      where: { productId: product.id },
      update: { quantity: 15 },
      create: { productId: product.id, quantity: 15 },
    });
  });
});
