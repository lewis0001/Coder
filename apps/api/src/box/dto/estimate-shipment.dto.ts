import { IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class EstimateShipmentDto {
  @IsNotEmpty()
  @IsString()
  regionId: string;

  @IsLatitude()
  pickupLatitude: number;

  @IsLongitude()
  pickupLongitude: number;

  @IsLatitude()
  dropoffLatitude: number;

  @IsLongitude()
  dropoffLongitude: number;

  @IsOptional()
  @IsNumber()
  packageWeight?: number;

  @IsOptional()
  @IsString()
  packageSize?: string;
}
