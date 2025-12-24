import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PartnerService } from './partner.service';
import { PartnerController } from './partner.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PartnerController],
  providers: [PartnerService, JwtAuthGuard, RolesGuard],
})
export class PartnerModule {}
