import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('HealthController (e2e)', () => {
  let app: INestApplication;
  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    enableShutdownHooks: jest.fn(),
  } as unknown as PrismaService;

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

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('returns healthy status and database ok', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
    expect(response.body.status).toBe('ok');
    expect(response.body.services.database).toBe('ok');
  });
});
