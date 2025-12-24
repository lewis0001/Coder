import { IsBoolean } from 'class-validator';

export class ToggleOnlineDto {
  @IsBoolean()
  online!: boolean;
}
