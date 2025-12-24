import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';
import { CartType } from '@prisma/client';

export class ApplyPromoDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsNumber()
  @IsPositive()
  subtotal!: number;

  @IsNumber()
  @IsOptional()
  @Max(1000)
  deliveryFee?: number;

  @IsOptional()
  @IsEnum(CartType)
  cartType?: CartType;
}
