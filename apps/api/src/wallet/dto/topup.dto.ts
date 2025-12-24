import { IsNumber, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

export class TopUpDto {
  @IsNumber()
  @IsPositive()
  @Min(1)
  @Max(1000)
  amount!: number;

  @IsString()
  @IsOptional()
  currency?: string;
}
