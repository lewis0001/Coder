import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DeliveryTaskStatus } from '@prisma/client';

export class UpdateTaskStatusDto {
  @IsEnum(DeliveryTaskStatus)
  status!: DeliveryTaskStatus;

  @IsOptional()
  @IsString()
  note?: string;
}
