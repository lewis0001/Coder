import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryTaskStatus } from '@prisma/client';

export class UpdateTaskStatusAdminDto {
  @IsEnum(DeliveryTaskStatus)
  status!: DeliveryTaskStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
