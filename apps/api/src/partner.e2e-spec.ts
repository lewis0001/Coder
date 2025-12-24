import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthUser } from './auth/types/auth-user';
import { PartnerService } from './partner/partner.service';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    req.user = {
      sub: 'partner-user-1',
      email: 'partner@example.com',
      roles: ['PARTNER'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };
    return true;
  }
}

const partnerServiceMock: Partial<Record<keyof PartnerService, jest.Mock>> = {
  getCatalog: jest.fn().mockResolvedValue({
    store: { id: 'store-1', name: 'Orbit Mart' },
    categories: [
      {
        id: 'cat-1',
        name: 'Pantry',
        products: [
          {
            id: 'prod-1',
            name: 'Olive Oil',
            basePrice: 12.5,
            isActive: true,
            variants: [{ id: 'var-1', name: '500ml', price: 12.5 }],
            inventory: { quantity: 50 },
          },
        ],
      },
    ],
  }),
  updateProduct: jest.fn().mockResolvedValue({ id: 'prod-1', basePrice: 15, isActive: false }),
  updateVariant: jest.fn().mockResolvedValue({ id: 'var-1', name: '1L', price: 20 }),
  updateInventory: jest.fn().mockResolvedValue({ productId: 'prod-1', quantity: 80 }),
};

describe('PartnerController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .overrideProvider(PartnerService)
      .useValue(partnerServiceMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns catalog for linked partner store', async () => {
    const res = await request(app.getHttpServer()).get('/v1/partner/catalog').expect(200);
    expect(res.body.store.id).toBe('store-1');
    expect(res.body.categories[0].products[0].name).toBe('Olive Oil');
    expect(partnerServiceMock.getCatalog).toHaveBeenCalledWith('partner-user-1');
  });

  it('updates product price and availability', async () => {
    const res = await request(app.getHttpServer())
      .put('/v1/partner/products/prod-1')
      .send({ price: 15, isActive: false })
      .expect(200);

    expect(res.body.basePrice).toBe(15);
    expect(res.body.isActive).toBe(false);
    expect(partnerServiceMock.updateProduct).toHaveBeenCalledWith('partner-user-1', 'prod-1', {
      price: 15,
      isActive: false,
    });
  });

  it('updates variant metadata', async () => {
    const res = await request(app.getHttpServer())
      .put('/v1/partner/variants/var-1')
      .send({ name: '1L', price: 20 })
      .expect(200);

    expect(res.body.name).toBe('1L');
    expect(res.body.price).toBe(20);
    expect(partnerServiceMock.updateVariant).toHaveBeenCalledWith('partner-user-1', 'var-1', {
      name: '1L',
      price: 20,
    });
  });

  it('updates inventory quantity', async () => {
    const res = await request(app.getHttpServer())
      .put('/v1/partner/products/prod-1/inventory')
      .send({ quantity: 80 })
      .expect(200);

    expect(res.body.quantity).toBe(80);
    expect(partnerServiceMock.updateInventory).toHaveBeenCalledWith('partner-user-1', 'prod-1', {
      quantity: 80,
    });
  });
});
