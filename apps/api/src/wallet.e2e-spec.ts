import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { WalletService } from './wallet/wallet.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthUser } from './auth/types/auth-user';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    req.user = {
      sub: 'user-1',
      email: 'user@example.com',
      roles: ['USER'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };
    return true;
  }
}

const walletResponse = {
  id: 'wallet-1',
  balance: 25,
  currency: 'USD',
  points: 10,
};

const transactionsResponse = {
  total: 1,
  data: [
    {
      id: 'tx-1',
      amount: 10,
      currency: 'USD',
      type: 'CREDIT',
      description: 'Top up',
      createdAt: new Date().toISOString(),
    },
  ],
};

const topUpResponse = {
  paymentIntentId: 'pi_test',
  clientSecret: 'secret',
  amount: 10,
  currency: 'USD',
};

const promoResponse = {
  discount: 5,
  code: 'WELCOME10',
  totalAfter: 45,
  type: 'PERCENT',
};

const walletServiceMock: Partial<Record<keyof WalletService, jest.Mock>> = {
  getWallet: jest.fn().mockResolvedValue(walletResponse),
  listTransactions: jest.fn().mockResolvedValue(transactionsResponse),
  topUp: jest.fn().mockResolvedValue(topUpResponse),
  applyPromo: jest.fn().mockResolvedValue(promoResponse),
};

describe('WalletController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .overrideProvider(WalletService)
      .useValue(walletServiceMock)
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

  it('returns wallet summary for authenticated user', async () => {
    const res = await request(app.getHttpServer()).get('/v1/wallet').expect(200);
    expect(res.body.balance).toBe(25);
    expect(walletServiceMock.getWallet).toHaveBeenCalledWith('user-1');
  });

  it('lists wallet transactions with pagination defaults', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/wallet/transactions?page=1&limit=10')
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe('tx-1');
    expect(walletServiceMock.listTransactions).toHaveBeenCalledWith('user-1', {
      page: 1,
      limit: 10,
    });
  });

  it('creates a top-up payment intent', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/wallet/topup')
      .send({ amount: 10 })
      .expect(201);

    expect(res.body.paymentIntentId).toBe('pi_test');
    expect(walletServiceMock.topUp).toHaveBeenCalledWith('user-1', { amount: 10 });
  });

  it('applies a promo code and returns discount breakdown', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/wallet/apply-promo')
      .send({ code: 'WELCOME10', subtotal: 50 })
      .expect(201);

    expect(res.body.discount).toBe(5);
    expect(res.body.code).toBe('WELCOME10');
    expect(walletServiceMock.applyPromo).toHaveBeenCalledWith('user-1', {
      code: 'WELCOME10',
      subtotal: 50,
    });
  });
});
