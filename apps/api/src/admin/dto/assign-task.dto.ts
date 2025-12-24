import { IsOptional, IsString } from 'class-validator';

export class AssignTaskDto {
  @IsString()
  taskId!: string;

  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
