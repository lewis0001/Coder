import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppService', () => {
  let service: AppService;
  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should return healthy status with database check', async () => {
    const result = await service.getHealth();
    expect(result.status).toBe('ok');
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
    expect(result.services.database).toBe('ok');
  });
});
