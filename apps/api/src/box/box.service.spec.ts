import { DeliveryTaskStatus, OrderStatus } from '@prisma/client';
import { BoxService } from './box.service';

const mockPrisma = {
  pricingRule: {
    findFirst: jest.fn(),
  },
  address: {
    findUnique: jest.fn(),
  },
  order: {
    create: jest.fn(),
  },
  deliveryTask: {
    create: jest.fn(),
  },
  taskEvent: {
    create: jest.fn(),
  },
  orderStatusEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(async (cb: any) => {
    if (typeof cb === 'function') {
      return cb(mockPrisma);
    }
    return Promise.all(cb as any);
  }),
} as any;

describe('BoxService', () => {
  let service: BoxService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BoxService(mockPrisma);
  });

  it('estimates delivery with surge and tax', async () => {
    mockPrisma.pricingRule.findFirst.mockResolvedValue({
      baseFee: 5,
      distanceRate: 1,
      surgeMultiplier: 1.5,
      taxRate: 10,
      region: { currency: 'USD' },
    });

    const result = await service.estimate({
      regionId: 'region-1',
      pickupLatitude: 0,
      pickupLongitude: 0,
      dropoffLatitude: 0,
      dropoffLongitude: 1,
    });

    expect(result.currency).toBe('USD');
    expect(result.distanceKm).toBeGreaterThan(100);
    expect(result.total).toBeGreaterThan(result.deliveryFee);
  });

  it('creates shipment with order and task', async () => {
    mockPrisma.address.findUnique.mockResolvedValue({
      id: 'addr-1',
      userId: 'user-1',
      line1: '123 Test St',
      latitude: 0,
      longitude: 0,
      regionId: 'region-1',
      region: { id: 'region-1', currency: 'USD' },
    });

    mockPrisma.pricingRule.findFirst.mockResolvedValue({
      baseFee: 5,
      distanceRate: 1,
      surgeMultiplier: 1,
      taxRate: 0,
      region: { currency: 'USD' },
    });

    mockPrisma.order.create.mockResolvedValue({
      id: 'order-1',
      status: OrderStatus.CONFIRMED,
    });

    mockPrisma.deliveryTask.create.mockResolvedValue({
      id: 'task-1',
      status: DeliveryTaskStatus.CREATED,
    });

    const response = await service.createShipment({
      userId: 'user-1',
      dropoffAddressId: 'addr-1',
      pickupLatitude: 0,
      pickupLongitude: 0,
      pickupAddress: 'Pickup Point',
      packageSize: 'Medium',
    });

    expect(response.orderId).toBe('order-1');
    expect(response.taskId).toBe('task-1');
    expect(mockPrisma.taskEvent.create).toHaveBeenCalled();
  });
});
