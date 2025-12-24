import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminTasksService } from './admin.tasks.service';
import { ListTasksDto } from './dto/list-tasks.dto';
import { AssignTaskDto } from './dto/assign-task.dto';
import { UpdateTaskStatusAdminDto } from './dto/update-task-status.dto';

@Controller('admin/tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'OPS')
export class AdminTasksController {
  constructor(private readonly service: AdminTasksService) {}

  @Get()
  list(@Query() query: ListTasksDto) {
    return this.service.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }

  @Post(':id/assign')
  assign(@Param('id') id: string, @Body() body: AssignTaskDto) {
    return this.service.assign({ ...body, taskId: id });
  }

  @Post(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: UpdateTaskStatusAdminDto) {
    return this.service.updateStatus(id, body);
  }
}
