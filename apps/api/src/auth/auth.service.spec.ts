import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'user@example.com',
  phone: '+10000000000',
  fullName: 'Test User',
  locale: 'en',
  passwordHash: 'hash',
  roles: [{ role: { name: 'user' } }],
};

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    role: {
      upsert: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const jwt = {
    signAsync: jest.fn(),
  } as unknown as JwtService;

  const config = {
    get: jest.fn().mockReturnValue('secret'),
  } as unknown as ConfigService;

  beforeEach(async () => {
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed');
    jest.spyOn(bcrypt, 'compare').mockImplementation(async (input) => input === 'password');
    jest.clearAllMocks();
    (jwt.signAsync as jest.Mock).mockResolvedValue('token');

    const module = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }, { provide: JwtService, useValue: jwt }, { provide: ConfigService, useValue: config }],
    }).compile();

    service = module.get(AuthService);
  });

  it('registers a user and returns tokens', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.role.upsert as jest.Mock).mockResolvedValue({ id: 'role-user', name: 'user' });
    (prisma.user.create as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: 'hashed' });
    (prisma.session.create as jest.Mock).mockResolvedValue({});

    const result = await service.register({ email: mockUser.email, fullName: mockUser.fullName, password: 'password', phone: mockUser.phone });

    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(prisma.session.create).toHaveBeenCalled();
    expect(result.user.email).toBe(mockUser.email);
    expect(result.user.roles).toContain('user');
  });

  it('throws on duplicate email', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    await expect(
      service.register({ email: mockUser.email, fullName: mockUser.fullName, password: 'password' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs in a user', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: 'hashed' });
    (prisma.session.create as jest.Mock).mockResolvedValue({});

    const result = await service.login({ email: mockUser.email, password: 'password' });
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ ...mockUser, passwordHash: 'hashed' });
    await expect(service.login({ email: mockUser.email, password: 'wrong' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refreshes a session', async () => {
    (prisma.session.findFirst as jest.Mock).mockResolvedValue({ id: 'session-1', user: mockUser });
    (prisma.session.update as jest.Mock).mockResolvedValue({});
    const tokens = await service.refresh({ refreshToken: 'refresh-token' });
    expect(tokens.refreshToken).toBeDefined();
  });

  it('handles OTP request and verify', async () => {
    const phone = '+10000000000';
    await service.requestOtp({ phone });
    await expect(service.verifyOtp({ phone, code: 'secret' })).resolves.toEqual({ success: true });
  });
});
