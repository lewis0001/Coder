import { IsEmail, IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';

export class RequestOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('ZZ')
  phone?: string;
}

export class VerifyOtpDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber('ZZ')
  phone?: string;

  @IsString()
  @Length(4, 6)
  code!: string;
}
