import { IsISO8601, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShipmentDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsString()
  dropoffAddressId: string;

  @IsLatitude()
  pickupLatitude: number;

  @IsLongitude()
  pickupLongitude: number;

  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @IsOptional()
  @IsNumber()
  packageWeight?: number;

  @IsOptional()
  @IsString()
  packageSize?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
