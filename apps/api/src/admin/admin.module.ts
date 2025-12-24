import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRestaurantsController } from './admin.restaurants.controller';
import { AdminRestaurantsService } from './admin.restaurants.service';
import { AdminStoresController } from './admin.stores.controller';
import { AdminStoresService } from './admin.stores.service';
import { AdminTasksController } from './admin.tasks.controller';
import { AdminTasksService } from './admin.tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [AdminRestaurantsController, AdminStoresController, AdminTasksController],
  providers: [
    AdminRestaurantsService,
    AdminStoresService,
    AdminTasksService,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AdminModule {}
