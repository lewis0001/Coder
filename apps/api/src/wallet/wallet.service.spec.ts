import { Test } from '@nestjs/testing';
import { Prisma, Wallet } from '@prisma/client';
import Stripe from 'stripe';
import { WalletService } from './wallet.service';
import { STRIPE_CLIENT } from '../stripe/constants';
import { PrismaService } from '../prisma/prisma.service';

const baseWallet: Wallet = {
  id: 'wallet-1',
  userId: 'user-1',
  balance: new Prisma.Decimal('0'),
  currency: 'usd',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createPrismaMock() {
  const walletData: Wallet = { ...baseWallet };
  const mock: any = {};
  Object.assign(mock, {
    wallet: {
      upsert: jest.fn().mockResolvedValue(walletData),
      update: jest.fn().mockResolvedValue({ ...walletData, balance: new Prisma.Decimal('25') }),
    },
    walletEntry: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'entry-1', createdAt: new Date(), ...data }),
      ),
    },
    paymentIntentRecord: {
      create: jest.fn().mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'pi-record', createdAt: new Date(), updatedAt: new Date(), ...data }),
      ),
    },
    transactionLedger: {
      create: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    promoCode: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'promo-1',
        code: 'WELCOME10',
        isActive: true,
        promotion: {
          id: 'promo-base',
          type: 'PERCENT',
          value: new Prisma.Decimal('10'),
          startsAt: null,
          endsAt: null,
          maxRedemptions: 10,
        },
      }),
    },
    promotionRedemption: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'redemption-1' }),
    },
    order: { count: jest.fn().mockResolvedValue(0) },
  });
  mock.$transaction = jest.fn(async (cb: any) => cb(mock));
  return mock as PrismaService & { $transaction: any };
}

const prismaMock = createPrismaMock();

const stripeMock = {
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_123',
      client_secret: 'secret',
      status: 'succeeded',
    } as Partial<Stripe.PaymentIntent>),
    update: jest.fn().mockResolvedValue({}),
  },
} as unknown as Stripe;

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.promoCode.findUnique.mockResolvedValue({
      id: 'promo-1',
      code: 'WELCOME10',
      isActive: true,
      promotion: {
        id: 'promo-base',
        type: 'PERCENT',
        value: new Prisma.Decimal('10'),
        startsAt: null,
        endsAt: null,
        maxRedemptions: 10,
      },
    });
    prismaMock.promotionRedemption.count.mockResolvedValue(0);
    prismaMock.promotionRedemption.findFirst.mockResolvedValue(null);
    prismaMock.order.count.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: STRIPE_CLIENT, useValue: stripeMock },
      ],
    }).compile();

    service = moduleRef.get(WalletService);
  });

  it('ensures wallet and returns summary', async () => {
    const result = await service.getWallet('user-1');
    expect(prismaMock.wallet.upsert).toHaveBeenCalled();
    expect(result.balance.toString()).toBe('0');
    expect(result.recentEntries).toEqual([]);
  });

  it('creates stripe intent and credits wallet on topup', async () => {
    const payload = { amount: 25 };
    const response = await service.topUp('user-1', payload as any);

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
      amount: 2500,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: { userId: 'user-1' },
    });
    expect(stripeMock.paymentIntents.update).toHaveBeenCalledWith('pi_123', {
      metadata: expect.objectContaining({
        userId: 'user-1',
        walletEntryId: 'entry-1',
        paymentRecordId: 'pi-record',
      }),
    });
    expect(response.paymentIntentId).toBe('pi_123');
    expect(prismaMock.walletEntry.create).toHaveBeenCalled();
    expect(prismaMock.wallet.update).toHaveBeenCalled();
    expect(prismaMock.paymentIntentRecord.create).toHaveBeenCalled();
  });

  it('applies percent promo and records redemption', async () => {
    const result = await service.applyPromo('user-1', {
      code: 'welcome10',
      subtotal: 50,
      cartType: 'FOOD',
    } as any);

    expect(prismaMock.promoCode.findUnique).toHaveBeenCalledWith({
      where: { code: 'WELCOME10' },
      include: { promotion: true },
    });
    expect(result.discount.amount.toString()).toBe('5');
    expect(result.discount.freeDelivery).toBe(false);
    expect(result.promo.type).toBe('PERCENT');
    expect(prismaMock.promotionRedemption.create).toHaveBeenCalled();
  });

  it('prevents double redemption for same user', async () => {
    prismaMock.promotionRedemption.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.applyPromo('user-1', { code: 'welcome10', subtotal: 10 } as any),
    ).rejects.toThrow('Promo code already used by this user');
  });
});
