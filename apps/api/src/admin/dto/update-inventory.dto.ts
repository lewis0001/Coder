import { IsInt } from 'class-validator';

export class UpdateInventoryDto {
  @IsInt()
  quantity!: number;
}
