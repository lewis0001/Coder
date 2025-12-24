import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { DeliveryTaskStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CourierService } from './courier.service';
import { ToggleOnlineDto } from './dto/toggle-online.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { AuthUser } from '../auth/types/auth-user';
import { ReqUser } from '../common/req-user.decorator';

@Controller('courier')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('COURIER')
export class CourierController {
  constructor(private readonly courierService: CourierService) {}

  @Post('online')
  async toggleOnline(@ReqUser() user: AuthUser, @Body() body: ToggleOnlineDto) {
    return this.courierService.toggleOnline(user.sub, body.online);
  }

  @Post('location')
  async recordLocation(@ReqUser() user: AuthUser, @Body() body: UpdateLocationDto) {
    return this.courierService.recordLocation(user.sub, body);
  }

  @Post('tasks/:id/accept')
  async acceptTask(@ReqUser() user: AuthUser, @Param('id') taskId: string) {
    return this.courierService.acceptTask(user.sub, taskId);
  }

  @Post('tasks/:id/status')
  async updateTaskStatus(
    @ReqUser() user: AuthUser,
    @Param('id') taskId: string,
    @Body() body: UpdateTaskStatusDto,
  ) {
    if (body.status === DeliveryTaskStatus.CREATED) {
      // Prevent regressing to created
      body.status = DeliveryTaskStatus.ASSIGNED;
    }
    return this.courierService.updateTaskStatus(user.sub, taskId, body);
  }
}
