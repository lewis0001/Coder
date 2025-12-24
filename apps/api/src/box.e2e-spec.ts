import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { DeliveryTaskStatus, OrderStatus, OrderType } from '@prisma/client';

const pricingRule = {
  id: 'pricing-1',
  regionId: 'region-1',
  baseFee: 5,
  distanceRate: 1.5,
  surgeMultiplier: 1,
  taxRate: 5,
  region: { id: 'region-1', currency: 'USD' },
};

const address = {
  id: 'addr-1',
  userId: 'user-1',
  regionId: 'region-1',
  line1: '123 Dropoff St',
  latitude: 25.2,
  longitude: 55.3,
  region: { id: 'region-1', currency: 'USD' },
  deletedAt: null,
};

const order = { id: 'order-1', status: OrderStatus.CONFIRMED, type: OrderType.BOX } as any;
const task = {
  id: 'task-1',
  orderId: order.id,
  status: DeliveryTaskStatus.CREATED,
  pickupLatitude: 25.0,
  pickupLongitude: 55.0,
  dropoffLatitude: address.latitude,
  dropoffLongitude: address.longitude,
} as any;

const pricing = {
  subtotal: 0,
  deliveryFee: 6,
  tax: 0.3,
  discount: 0,
  total: 6.3,
  currency: 'USD',
} as any;

const prismaMock = {
  pricingRule: {
    findFirst: jest.fn(),
  },
  address: {
    findUnique: jest.fn(),
  },
  order: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  deliveryTask: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  taskEvent: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaService;

describe('BoxController (e2e)', () => {
  let app: INestApplication;

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
    prismaMock.pricingRule.findFirst.mockResolvedValue(pricingRule);
    prismaMock.address.findUnique.mockResolvedValue(address);
    prismaMock.order.create.mockResolvedValue(order);
    prismaMock.deliveryTask.create.mockResolvedValue(task);
    prismaMock.taskEvent.create.mockResolvedValue({});
    prismaMock.order.findFirst.mockResolvedValue({
      ...order,
      address,
      deliveryTask: { ...task, events: [], proof: null },
      pricing,
    });
    prismaMock.$transaction.mockImplementation(async (cb: any) =>
      cb({
        order: prismaMock.order,
        deliveryTask: prismaMock.deliveryTask,
        taskEvent: prismaMock.taskEvent,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('estimates shipment pricing', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/box/estimate')
      .send({
        regionId: 'region-1',
        pickupLatitude: 25.0,
        pickupLongitude: 55.0,
        dropoffLatitude: 25.2,
        dropoffLongitude: 55.3,
        packageSize: 'SMALL',
        packageWeight: 1.2,
      })
      .expect(200);

    expect(res.body.currency).toBe('USD');
    expect(res.body.total).toBeGreaterThan(0);
    expect(prismaMock.pricingRule.findFirst).toHaveBeenCalled();
  });

  it('returns 404 when pricing rule missing', async () => {
    prismaMock.pricingRule.findFirst.mockResolvedValueOnce(null);
    await request(app.getHttpServer())
      .post('/v1/box/estimate')
      .send({
        regionId: 'missing',
        pickupLatitude: 0,
        pickupLongitude: 0,
        dropoffLatitude: 0,
        dropoffLongitude: 0,
        packageSize: 'SMALL',
        packageWeight: 1,
      })
      .expect(404);
  });

  it('creates a box shipment and returns order/task ids', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/box/shipments')
      .send({
        userId: address.userId,
        dropoffAddressId: address.id,
        pickupAddress: 'Lobby',
        pickupLatitude: 25.0,
        pickupLongitude: 55.0,
        packageSize: 'SMALL',
        packageWeight: 1.2,
      })
      .expect(201);

    expect(prismaMock.address.findUnique).toHaveBeenCalledWith({
      where: { id: address.id, deletedAt: null },
      include: { region: true },
    });
    expect(res.body.orderId).toBe(order.id);
    expect(res.body.taskId).toBe(task.id);
  });

  it('returns shipment detail', async () => {
    const res = await request(app.getHttpServer()).get(`/v1/box/shipments/${order.id}`).expect(200);
    expect(res.body.id).toBe(order.id);
    expect(res.body.task.status).toBe(task.status);
    expect(res.body.pricing.total).toBe(pricing.total);
  });
});
