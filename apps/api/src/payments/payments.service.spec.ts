import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentsService', () => {
  const stripeMock = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  } as unknown as Stripe;

  const prismaMock = {
    paymentIntentRecord: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transactionLedger: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    walletEntry: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  const configMock = {
    get: jest.fn((key: string) => (key === 'STRIPE_WEBHOOK_SECRET' ? 'whsec_test' : undefined)),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates records on successful payment intent', async () => {
    const service = new PaymentsService(configMock, prismaMock, stripeMock);
    const intent = { id: 'pi_123', status: 'succeeded' } as Stripe.PaymentIntent;
    const event = { type: 'payment_intent.succeeded', data: { object: intent } } as any;
    (stripeMock.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    (prismaMock.paymentIntentRecord.findUnique as jest.Mock).mockResolvedValue({ id: 'pay_1' });
    (prismaMock.transactionLedger.findFirst as jest.Mock).mockResolvedValue({ id: 'ledger_1', walletEntryId: 'entry_1' });
    (prismaMock.walletEntry.update as jest.Mock).mockResolvedValue({});

    (prismaMock.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prismaMock));

    const result = await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ received: true });
    expect(prismaMock.paymentIntentRecord.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: 'SUCCEEDED' },
    });
    expect(prismaMock.transactionLedger.update).toHaveBeenCalledWith({
      where: { id: 'ledger_1' },
      data: { status: 'SUCCEEDED' },
    });
    expect(prismaMock.walletEntry.update).toHaveBeenCalled();
  });

  it('reverses wallet entry on canceled intent', async () => {
    const service = new PaymentsService(configMock, prismaMock, stripeMock);
    const intent = { id: 'pi_456', status: 'canceled' } as Stripe.PaymentIntent;
    const event = { type: 'payment_intent.canceled', data: { object: intent } } as any;
    (stripeMock.webhooks.constructEvent as jest.Mock).mockReturnValue(event);

    (prismaMock.paymentIntentRecord.findUnique as jest.Mock).mockResolvedValue({ id: 'pay_2' });
    (prismaMock.transactionLedger.findFirst as jest.Mock).mockResolvedValue({
      id: 'ledger_2',
      walletEntryId: 'entry_2',
    });
    (prismaMock.walletEntry.findUnique as jest.Mock).mockResolvedValue({
      id: 'entry_2',
      walletId: 'wallet_1',
      amount: { toString: () => '10.00' },
    });

    (prismaMock.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prismaMock));

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(prismaMock.wallet.update).toHaveBeenCalledWith({
      where: { id: 'wallet_1' },
      data: { balance: { decrement: { toString: expect.any(Function) } as any } },
    });
    expect(prismaMock.walletEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ walletId: 'wallet_1', type: 'TOPUP_REVERSAL', reference: 'pi_456' }),
    });
  });
});
