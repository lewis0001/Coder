import { Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryTaskStatus, OrderStatus, OrderType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EstimateShipmentDto } from './dto/estimate-shipment.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';

const EARTH_RADIUS_KM = 6371;

@Injectable()
export class BoxService {
  constructor(private readonly prisma: PrismaService) {}

  async estimate(params: EstimateShipmentDto) {
    const pricingRule = await this.prisma.pricingRule.findFirst({
      where: { regionId: params.regionId },
      include: { region: true },
    });

    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found for region');
    }

    const distanceKm = this.calculateDistanceKm(
      params.pickupLatitude,
      params.pickupLongitude,
      params.dropoffLatitude,
      params.dropoffLongitude,
    );

    const baseFee = Number(pricingRule.baseFee);
    const distanceFee = Number(pricingRule.distanceRate) * distanceKm;
    const surgeMultiplier = Number(pricingRule.surgeMultiplier ?? 1);
    const taxRate = Number(pricingRule.taxRate ?? 0);

    const deliveryFee = (baseFee + distanceFee) * surgeMultiplier;
    const tax = deliveryFee * (taxRate / 100);
    const total = deliveryFee + tax;

    return {
      currency: pricingRule.region.currency,
      distanceKm: Number(distanceKm.toFixed(2)),
      deliveryFee: Number(deliveryFee.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }

  async createShipment(params: CreateShipmentDto) {
    const address = await this.prisma.address.findUnique({
      where: { id: params.dropoffAddressId, deletedAt: null },
      include: { region: true },
    });

    if (!address || address.userId !== params.userId) {
      throw new NotFoundException('Dropoff address not found for user');
    }

    const pricingRule = await this.prisma.pricingRule.findFirst({
      where: { regionId: address.regionId },
      include: { region: true },
    });

    if (!pricingRule) {
      throw new NotFoundException('Pricing rule not found for region');
    }

    const estimate = await this.estimate({
      regionId: address.regionId,
      pickupLatitude: params.pickupLatitude,
      pickupLongitude: params.pickupLongitude,
      dropoffLatitude: address.latitude ?? 0,
      dropoffLongitude: address.longitude ?? 0,
      packageSize: params.packageSize,
      packageWeight: params.packageWeight,
    });

    const scheduledAt = params.scheduledAt ? new Date(params.scheduledAt) : undefined;

    const { order, task } = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: params.userId,
          type: OrderType.BOX,
          addressId: address.id,
          status: OrderStatus.CONFIRMED,
          pricing: {
            create: {
              subtotal: new Prisma.Decimal('0'),
              deliveryFee: new Prisma.Decimal(estimate.deliveryFee.toFixed(2)),
              tax: new Prisma.Decimal(estimate.tax.toFixed(2)),
              discount: new Prisma.Decimal('0'),
              total: new Prisma.Decimal(estimate.total.toFixed(2)),
              currency: pricingRule.region.currency,
            },
          },
          events: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: 'Box shipment created',
            },
          },
        },
      });

      const task = await tx.deliveryTask.create({
        data: {
          orderId: order.id,
          status: DeliveryTaskStatus.CREATED,
          pickupAddress: params.pickupAddress,
          pickupLatitude: params.pickupLatitude,
          pickupLongitude: params.pickupLongitude,
          dropoffAddress: address.line1,
          dropoffLatitude: address.latitude,
          dropoffLongitude: address.longitude,
          packageWeight: params.packageWeight,
          packageSize: params.packageSize,
          instructions: params.instructions,
          scheduledAt,
        },
      });

      await tx.taskEvent.create({
        data: {
          taskId: task.id,
          status: DeliveryTaskStatus.CREATED,
          note: 'Task created',
        },
      });

      return { order, task };
    });

    return {
      orderId: order.id,
      taskId: task.id,
      status: order.status,
      estimate,
    };
  }

  async getShipment(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, type: OrderType.BOX, deletedAt: null },
      include: {
        address: true,
        deliveryTask: { include: { events: true, proof: true } },
        pricing: true,
      },
    });

    if (!order || !order.deliveryTask) {
      throw new NotFoundException('Shipment not found');
    }

    return {
      id: order.id,
      status: order.status,
      pricing: order.pricing,
      address: order.address,
      task: {
        id: order.deliveryTask.id,
        status: order.deliveryTask.status,
        pickupLatitude: order.deliveryTask.pickupLatitude,
        pickupLongitude: order.deliveryTask.pickupLongitude,
        dropoffLatitude: order.deliveryTask.dropoffLatitude,
        dropoffLongitude: order.deliveryTask.dropoffLongitude,
        events: order.deliveryTask.events,
        proof: order.deliveryTask.proof,
        scheduledAt: order.deliveryTask.scheduledAt,
      },
    };
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
  }
}
