import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AuthUser } from './auth/types/auth-user';
import { CourierService } from './courier/courier.service';
import { DeliveryTaskStatus } from '@prisma/client';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    req.user = {
      sub: 'courier-user-1',
      email: 'courier@example.com',
      roles: ['COURIER'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900,
    };
    return true;
  }
}

const courierServiceMock: Partial<Record<keyof CourierService, jest.Mock>> = {
  toggleOnline: jest.fn().mockResolvedValue({ id: 'courier-1', online: true }),
  recordLocation: jest.fn().mockResolvedValue({ id: 'loc-1' }),
  acceptTask: jest.fn().mockResolvedValue({ id: 'task-1', status: DeliveryTaskStatus.ASSIGNED }),
  updateTaskStatus: jest
    .fn()
    .mockResolvedValue({ id: 'task-1', status: DeliveryTaskStatus.PICKED_UP }),
};

describe('CourierController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .overrideProvider(CourierService)
      .useValue(courierServiceMock)
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

  it('toggles courier online status', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/courier/online')
      .send({ online: true })
      .expect(201);

    expect(res.body.online).toBe(true);
    expect(courierServiceMock.toggleOnline).toHaveBeenCalledWith('courier-user-1', true);
  });

  it('records courier location', async () => {
    await request(app.getHttpServer())
      .post('/v1/courier/location')
      .send({ latitude: 1, longitude: 2 })
      .expect(201);

    expect(courierServiceMock.recordLocation).toHaveBeenCalledWith('courier-user-1', {
      latitude: 1,
      longitude: 2,
    });
  });

  it('accepts a task', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/courier/tasks/task-1/accept')
      .expect(201);

    expect(res.body.status).toBe(DeliveryTaskStatus.ASSIGNED);
    expect(courierServiceMock.acceptTask).toHaveBeenCalledWith('courier-user-1', 'task-1');
  });

  it('updates task status', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/courier/tasks/task-1/status')
      .send({ status: DeliveryTaskStatus.PICKED_UP })
      .expect(201);

    expect(res.body.status).toBe(DeliveryTaskStatus.PICKED_UP);
    expect(courierServiceMock.updateTaskStatus).toHaveBeenCalledWith('courier-user-1', 'task-1', {
      status: DeliveryTaskStatus.PICKED_UP,
    });
  });
});
