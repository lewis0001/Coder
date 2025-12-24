import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CourierController } from './courier.controller';
import { CourierService } from './courier.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CourierController],
  providers: [CourierService, JwtAuthGuard, RolesGuard],
})
export class CourierModule {}
