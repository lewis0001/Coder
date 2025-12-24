import { IsOptional, IsString } from 'class-validator';

export class ListCategoriesDto {
  @IsOptional()
  @IsString()
  storeId?: string;
}
