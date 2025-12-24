import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ShopService } from './shop.service';

const prismaMock = {
  $transaction: jest.fn(),
  productCategory: {
    findMany: jest.fn(),
  },
  product: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
} as unknown as PrismaService;

describe('ShopService', () => {
  let service: ShopService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(ShopService);
  });

  it('lists categories with store metadata', async () => {
    (prismaMock.productCategory.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'c1', name: 'Produce', sortOrder: 0, storeId: 's1', store: { name: 'Orbit Mart' } },
    ]);

    const result = await service.listCategories({});
    expect(result[0].storeName).toBe('Orbit Mart');
  });

  it('paginates and sorts products', async () => {
    (prismaMock.$transaction as jest.Mock).mockResolvedValueOnce([
      1,
      [
        {
          id: 'p1',
          name: 'Item',
          description: 'Desc',
          basePrice: 10,
          storeId: 's1',
          store: { name: 'Store' },
          categoryId: 'c1',
          category: { name: 'Cat' },
          isActive: true,
        },
      ],
    ]);

    const result = await service.listProducts({ page: 1, limit: 10, sort: 'price_desc' });
    expect(result.total).toBe(1);
    expect(result.data[0].categoryName).toBe('Cat');
  });

  it('throws when product not found', async () => {
    (prismaMock.product.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getProduct('missing')).rejects.toThrow();
  });

  it('returns product detail with inventory and variants', async () => {
    (prismaMock.product.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'p1',
      name: 'Item',
      description: 'Desc',
      basePrice: 10,
      storeId: 's1',
      store: { name: 'Store' },
      categoryId: 'c1',
      category: { name: 'Cat' },
      isActive: true,
      variants: [{ id: 'v1', name: 'Standard', price: 10, sku: 'SKU-1' }],
      inventory: { quantity: 5 },
    });

    const result = await service.getProduct('p1');
    expect(result.inventory).toBe(5);
    expect(result.variants[0].sku).toBe('SKU-1');
  });
});
