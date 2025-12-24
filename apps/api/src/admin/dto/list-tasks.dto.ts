import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DeliveryTaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ListTasksDto {
  @IsOptional()
  @IsEnum(DeliveryTaskStatus)
  status?: DeliveryTaskStatus;

  @IsOptional()
  @IsString()
  courierId?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
