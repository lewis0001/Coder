import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('ShopController (e2e)', () => {
  let app: INestApplication;

  const category = { id: 'cat-1', name: 'Pantry', sortOrder: 0, storeId: 'store-1', store: { id: 'store-1', name: 'Orbit Mart' } } as any;

  const product = {
    id: 'prod-1',
    name: 'Olive Oil',
    description: 'Extra virgin',
    basePrice: 12.5,
    storeId: 'store-1',
    store: { id: 'store-1', name: 'Orbit Mart' },
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Pantry' },
    isActive: true,
    variants: [
      { id: 'var-1', name: '500ml', price: 12.5, sku: 'SKU-0001' },
      { id: 'var-2', name: '1L', price: 20, sku: 'SKU-0002' },
    ],
    inventory: { quantity: 50 },
  } as any;

  const prismaMock = {
    productCategory: {
      findMany: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.productCategory.findMany.mockResolvedValue([category]);
    prismaMock.product.count.mockResolvedValue(1);
    prismaMock.product.findMany.mockResolvedValue([product]);
    prismaMock.$transaction.mockResolvedValue([1, [product]]);
    prismaMock.product.findUnique.mockResolvedValue(product);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists categories with store metadata', async () => {
    const res = await request(app.getHttpServer()).get('/v1/shop/categories').expect(200);
    expect(res.body[0].name).toBe('Pantry');
    expect(res.body[0].storeName).toBe('Orbit Mart');
    expect(prismaMock.productCategory.findMany).toHaveBeenCalled();
  });

  it('lists products with pagination and search params', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/shop/products?storeId=store-1&categoryId=cat-1&search=oil&sort=price_desc&page=2&limit=5')
      .expect(200);

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].storeName).toBe('Orbit Mart');
    expect(res.body.data[0].categoryName).toBe('Pantry');
  });

  it('returns a single product with variants and inventory', async () => {
    const res = await request(app.getHttpServer()).get('/v1/shop/products/prod-1').expect(200);
    expect(res.body.id).toBe('prod-1');
    expect(res.body.variants).toHaveLength(2);
    expect(res.body.inventory).toBe(50);
  });

  it('returns 404 for missing product', async () => {
    prismaMock.product.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/v1/shop/products/missing').expect(404);
  });

  it('searches products by keyword', async () => {
    const res = await request(app.getHttpServer()).get('/v1/shop/search?search=oil&limit=3').expect(200);
    expect(prismaMock.product.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          { name: { contains: 'oil', mode: 'insensitive' } },
          { description: { contains: 'oil', mode: 'insensitive' } },
        ],
      },
      include: { store: true, category: true },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    expect(res.body[0].name).toBe('Olive Oil');
  });
});
