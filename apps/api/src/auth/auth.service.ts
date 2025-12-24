import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthPayload, AuthResponse, AuthTokens } from './types/auth-response';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';

interface OtpRecord {
  code: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly otpStore = new Map<string, OtpRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findFirst({ where: { email: payload.email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const role = await this.ensureRole('user');
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        phone: payload.phone,
        fullName: payload.fullName,
        passwordHash,
        roles: {
          create: {
            roleId: role.id,
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });

    const tokens = await this.createSessionAndTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  async login(payload: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findFirst({
      where: { email: payload.email },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createSessionAndTokens(user);
    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(payload: RefreshDto): Promise<AuthTokens> {
    const session = await this.prisma.session.findFirst({
      where: {
        refreshToken: payload.refreshToken,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    return this.rotateSession(session.user, session.id);
  }

  async logout(payload: LogoutDto) {
    await this.prisma.session.updateMany({
      where: { refreshToken: payload.refreshToken, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async requestOtp(payload: RequestOtpDto) {
    const code = this.configService.get<string>('OTP_CODE', '000000');
    const key = payload.phone || payload.email;
    if (!key) {
      throw new BadRequestException('phone or email required');
    }

    this.otpStore.set(key, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
    return { success: true };
  }

  async verifyOtp(payload: VerifyOtpDto) {
    const key = payload.phone || payload.email;
    if (!key) {
      throw new BadRequestException('phone or email required');
    }

    const stored = this.otpStore.get(key);
    const expectedCode = stored?.code || this.configService.get<string>('OTP_CODE', '000000');
    const isExpired = stored ? stored.expiresAt < Date.now() : false;

    if (isExpired || payload.code !== expectedCode) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    if (stored) {
      this.otpStore.delete(key);
    }

    return { success: true };
  }

  private async ensureRole(name: string) {
    return this.prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  private sanitizeUser(user: User & { roles: { role: { name: string } }[] }) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      locale: user.locale,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  private async createSessionAndTokens(user: User & { roles: { role: { name: string } }[] }) {
    const tokens = await this.buildTokens(user);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });

    return tokens;
  }

  private async rotateSession(user: User & { roles: { role: { name: string } }[] }, sessionId: string) {
    const tokens = await this.buildTokens(user);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });
    return tokens;
  }

  private async buildTokens(user: User & { roles: { role: { name: string } }[] }): Promise<AuthTokens> {
    const roles = user.roles.map((r) => r.role.name);
    const payload: AuthPayload = { sub: user.id, email: user.email, roles };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: '7d',
    });
    const expiresIn = 7 * 24 * 60 * 60;
    return { accessToken, refreshToken, expiresIn };
  }
}
