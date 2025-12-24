import { Inject, Injectable, Logger } from '@nestjs/common';
import { CartType, PaymentStatus, Prisma, PromotionType } from '@prisma/client';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from '../stripe/constants';
import { TopUpDto } from './dto/topup.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyPromoDto } from './dto/apply-promo.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  async ensureWallet(userId: string, currency = 'usd') {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        currency: currency.toLowerCase(),
      },
    });
  }

  async getWallet(userId: string) {
    const wallet = await this.ensureWallet(userId);
    const latestEntries = await this.prisma.walletEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      recentEntries: latestEntries,
    };
  }

  async listTransactions(userId: string, params: ListTransactionsDto) {
    const wallet = await this.ensureWallet(userId);
    const take = params.take ?? 20;
    const cursor = params.cursor ? { id: params.cursor } : undefined;

    const entries = await this.prisma.walletEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take,
      skip: cursor ? 1 : 0,
      cursor,
    });

    return { entries, cursor: entries.length === take ? entries[entries.length - 1].id : null };
  }

  private mapStripeStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return 'SUCCEEDED';
      case 'processing':
        return 'PROCESSING';
      case 'canceled':
        return 'CANCELED';
      default:
        return 'REQUIRES_ACTION';
    }
  }

  async topUp(userId: string, payload: TopUpDto) {
    const wallet = await this.ensureWallet(userId, payload.currency ?? 'usd');
    const amountCents = Math.round(payload.amount * 100);
    const currency = (payload.currency ?? wallet.currency ?? 'usd').toLowerCase();

    const intent = await this.stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { userId },
    });

    const status = this.mapStripeStatus(intent.status);
    const amountDecimal = new Prisma.Decimal(payload.amount.toFixed(2));

    const { entry, paymentRecord } = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const entry = await tx.walletEntry.create({
        data: {
          walletId: wallet.id,
          amount: amountDecimal,
          type: 'TOPUP_STRIPE',
          reference: intent.id,
        },
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountDecimal } },
      });

      const paymentRecord = await tx.paymentIntentRecord.create({
        data: {
          stripeIntentId: intent.id,
          clientSecret: intent.client_secret ?? '',
          status,
          amount: amountDecimal,
          currency,
          orderId: null,
        },
      });

      await tx.transactionLedger.create({
        data: {
          walletEntryId: entry.id,
          paymentIntentId: paymentRecord.id,
          amount: amountDecimal,
          status,
        },
      });

      return { entry, paymentRecord };
    });

    await this.stripe.paymentIntents.update(intent.id, {
      metadata: {
        ...(intent.metadata || {}),
        userId,
        walletEntryId: entry.id,
        paymentRecordId: paymentRecord.id,
      },
    });

    this.logger.log(`Wallet top-up initiated for user ${userId} intent ${intent.id}`);

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      walletEntryId: entry.id,
      status,
    };
  }

  async applyPromo(userId: string, payload: ApplyPromoDto) {
    const code = payload.code.trim().toUpperCase();
    const now = new Date();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
      include: { promotion: true },
    });

    if (!promo || !promo.isActive) {
      throw new Error('Promo code is invalid or inactive');
    }

    const { promotion } = promo;
    if (promotion.startsAt && promotion.startsAt > now) {
      throw new Error('Promo code is not yet active');
    }
    if (promotion.endsAt && promotion.endsAt < now) {
      throw new Error('Promo code has expired');
    }

    if (promotion.maxRedemptions) {
      const redemptionCount = await this.prisma.promotionRedemption.count({
        where: { promoCodeId: promo.id },
      });
      if (redemptionCount >= promotion.maxRedemptions) {
        throw new Error('Promo code has reached its redemption limit');
      }
    }

    const existingUserRedemption = await this.prisma.promotionRedemption.findFirst({
      where: { promoCodeId: promo.id, userId },
    });
    if (existingUserRedemption) {
      throw new Error('Promo code already used by this user');
    }

    if (promotion.type === PromotionType.FIRST_ORDER) {
      const priorOrders = await this.prisma.order.count({ where: { userId } });
      if (priorOrders > 0) {
        throw new Error('Promo code only valid for first order');
      }
    }

    const subtotal = new Prisma.Decimal(payload.subtotal.toFixed(2));
    const deliveryFee = payload.deliveryFee ? new Prisma.Decimal(payload.deliveryFee.toFixed(2)) : null;

    let discountValue = new Prisma.Decimal(0);
    let freeDelivery = false;

    switch (promotion.type) {
      case PromotionType.PERCENT: {
        const percentValue = promotion.value.toNumber();
        discountValue = subtotal.mul(percentValue).div(100);
        break;
      }
      case PromotionType.FIXED:
      case PromotionType.FIRST_ORDER: {
        discountValue = Prisma.Decimal.min(subtotal, promotion.value);
        break;
      }
      case PromotionType.FREE_DELIVERY: {
        freeDelivery = true;
        if (deliveryFee) {
          discountValue = Prisma.Decimal.min(deliveryFee, promotion.value);
        }
        break;
      }
      default:
        discountValue = new Prisma.Decimal(0);
    }

    const redemption = await this.prisma.promotionRedemption.create({
      data: {
        promoCodeId: promo.id,
        userId,
      },
    });

    return {
      promo: {
        code: promo.code,
        promotionId: promotion.id,
        type: promotion.type,
      },
      discount: {
        amount: discountValue,
        freeDelivery,
        currency: 'usd',
      },
      cartType: payload.cartType ?? CartType.FOOD,
      redemptionId: redemption.id,
    };
  }
}
