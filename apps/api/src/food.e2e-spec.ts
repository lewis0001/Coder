import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { MenuItemOptionGroupType } from '@prisma/client';

describe('FoodController (e2e)', () => {
  let app: INestApplication;
  const restaurant = {
    id: 'rest-1',
    name: 'Test Kitchen',
    description: 'Great food',
    address: '123 Street',
    latitude: 10,
    longitude: 20,
    cuisines: [{ cuisine: { name: 'Pizza' } }],
    hours: [{ dayOfWeek: 1, opensAt: '08:00', closesAt: '22:00' }],
    deletedAt: null,
  } as any;

  const categories = [
    {
      id: 'cat-1',
      name: 'Mains',
      sortOrder: 0,
      items: [
        {
          id: 'item-1',
          name: 'Margherita',
          description: 'Cheesy',
          price: 12.5,
          isAvailable: true,
          optionGroups: [
            {
              id: 'opt-group-1',
              name: 'Size',
              type: MenuItemOptionGroupType.SINGLE,
              minSelect: 1,
              maxSelect: 1,
              sortOrder: 0,
              options: [
                { id: 'opt-1', name: 'Regular', priceDelta: 0, sortOrder: 0 },
                { id: 'opt-2', name: 'Large', priceDelta: 2, sortOrder: 1 },
              ],
            },
          ],
        },
      ],
    },
  ] as any;

  const prismaMock = {
    restaurant: {
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    menuCategory: {
      findMany: jest.fn(),
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
    prismaMock.restaurant.findUnique.mockResolvedValue(restaurant);
    prismaMock.restaurant.count.mockResolvedValue(1);
    prismaMock.restaurant.findMany.mockResolvedValue([restaurant]);
    prismaMock.$transaction.mockResolvedValue([1, [restaurant]]);
    prismaMock.menuCategory.findMany.mockResolvedValue(categories);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists restaurants with cuisines and hours', async () => {
    const res = await request(app.getHttpServer()).get('/v1/food/restaurants').expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toBe('Test Kitchen');
    expect(res.body.data[0].cuisines).toEqual(['Pizza']);
  });

  it('gets a single restaurant by id', async () => {
    const res = await request(app.getHttpServer()).get('/v1/food/restaurants/rest-1').expect(200);
    expect(res.body.id).toBe('rest-1');
    expect(res.body.address).toBe('123 Street');
  });

  it('returns 404 for missing restaurant detail', async () => {
    prismaMock.restaurant.findUnique.mockResolvedValueOnce(null);
    await request(app.getHttpServer()).get('/v1/food/restaurants/missing').expect(404);
  });

  it('gets a menu with option groups', async () => {
    const res = await request(app.getHttpServer()).get('/v1/food/restaurants/rest-1/menu').expect(200);
    expect(prismaMock.menuCategory.findMany).toHaveBeenCalledWith({
      where: { restaurantId: 'rest-1' },
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            optionGroups: {
              orderBy: { sortOrder: 'asc' },
              include: { options: { orderBy: { sortOrder: 'asc' } } },
            },
          },
        },
      },
    });
    expect(res.body.categories[0].items[0].optionGroups[0].options).toHaveLength(2);
  });
});
