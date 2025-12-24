import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClientKnownRequestError } from '@prisma/client';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from '../stripe/constants';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  private mapStripeStatus(status: Stripe.PaymentIntent.Status) {
    switch (status) {
      case 'succeeded':
        return 'SUCCEEDED' as const;
      case 'processing':
        return 'PROCESSING' as const;
      case 'canceled':
        return 'CANCELED' as const;
      default:
        return 'REQUIRES_ACTION' as const;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('Missing STRIPE_WEBHOOK_SECRET');
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret);

    if (event.type.startsWith('payment_intent.')) {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.handlePaymentIntent(intent);
    }

    return { received: true };
  }

  private async handlePaymentIntent(intent: Stripe.PaymentIntent) {
    const record = await this.prisma.paymentIntentRecord.findUnique({
      where: { stripeIntentId: intent.id },
    });

    if (!record) {
      this.logger.warn(`No payment intent record found for ${intent.id}`);
      return;
    }

    const newStatus = this.mapStripeStatus(intent.status);

    try {
      await this.prisma.$transaction(async (tx) => {
        const updatedRecord = await tx.paymentIntentRecord.update({
          where: { id: record.id },
          data: { status: newStatus },
        });

        const ledger = await tx.transactionLedger.findFirst({
          where: { paymentIntentId: updatedRecord.id },
        });

        if (ledger) {
          await tx.transactionLedger.update({
            where: { id: ledger.id },
            data: { status: newStatus },
          });

          if (['CANCELED'].includes(newStatus)) {
            await this.reverseWalletEntry(tx, ledger.walletEntryId, intent.id);
          }
        }

        if (newStatus === 'SUCCEEDED' && ledger?.walletEntryId) {
          await tx.walletEntry.update({
            where: { id: ledger.walletEntryId },
            data: { type: 'TOPUP_STRIPE', reference: intent.id },
          });
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        this.logger.error(`Prisma error while handling intent ${intent.id}`, error.meta);
      }
      throw error;
    }
  }

  private async reverseWalletEntry(
    tx: Prisma.TransactionClient,
    walletEntryId: string | null | undefined,
    reference: string,
  ) {
    if (!walletEntryId) return;

    const walletEntry = await tx.walletEntry.findUnique({ where: { id: walletEntryId } });
    if (!walletEntry) return;

    const reversalAmount = new Prisma.Decimal(walletEntry.amount.toString()).mul(-1);

    await tx.wallet.update({
      where: { id: walletEntry.walletId },
      data: { balance: { decrement: walletEntry.amount } },
    });

    await tx.walletEntry.create({
      data: {
        walletId: walletEntry.walletId,
        amount: reversalAmount,
        type: 'TOPUP_REVERSAL',
        reference,
      },
    });
  }
}
