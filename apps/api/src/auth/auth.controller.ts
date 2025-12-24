import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle(5, 60)
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle(10, 60)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(20, 120)
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refresh(body);
  }

  @Post('logout')
  @HttpCode(200)
  @Throttle(20, 120)
  async logout(@Body() body: LogoutDto) {
    return this.authService.logout(body);
  }

  @Post('request-otp')
  @Throttle(5, 300)
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body);
  }

  @Post('verify-otp')
  @Throttle(5, 300)
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }
}
