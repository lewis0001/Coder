import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { FoodService } from './food.service';

const prismaMock = {
  $transaction: jest.fn(),
  restaurant: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  menuCategory: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService;

describe('FoodService', () => {
  let service: FoodService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get(FoodService);
  });

  it('lists restaurants with pagination', async () => {
    (prismaMock.$transaction as jest.Mock).mockResolvedValueOnce([
      1,
      [
        {
          id: 'r1',
          name: 'Test Resto',
          description: 'Desc',
          address: '123',
          latitude: 0,
          longitude: 0,
          cuisines: [{ cuisine: { name: 'Burgers' } }],
          hours: [],
        },
      ],
    ]);

    const result = await service.listRestaurants({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe('Test Resto');
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('throws for missing restaurant detail', async () => {
    (prismaMock.restaurant.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getRestaurant('missing')).rejects.toThrow();
  });

  it('returns menu categories with items', async () => {
    (prismaMock.restaurant.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'r1' });
    (prismaMock.menuCategory.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        name: 'Category',
        sortOrder: 0,
        items: [
          {
            id: 'i1',
            name: 'Item',
            description: 'Desc',
            price: 10,
            isAvailable: true,
            optionGroups: [
              {
                id: 'g1',
                name: 'Size',
                type: 'SINGLE',
                minSelect: 1,
                maxSelect: 1,
                sortOrder: 0,
                options: [{ id: 'o1', name: 'Regular', priceDelta: 0, sortOrder: 0 }],
              },
            ],
          },
        ],
      },
    ]);

    const menu = await service.getMenu('r1');
    expect(menu.categories[0].items[0].optionGroups[0].options[0].name).toBe('Regular');
  });
});
