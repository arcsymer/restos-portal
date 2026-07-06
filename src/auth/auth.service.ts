import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<TokenPair> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('email already registered');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'customer',
        account: { create: {} },
      },
    });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('invalid credentials');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.get<string>(
          'JWT_REFRESH_SECRET',
          'dev-refresh-secret',
        ),
      });
    } catch {
      throw new UnauthorizedException('invalid refresh token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('invalid refresh token');
    }
    return this.issueTokens(user.id, user.email, user.role);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync({ sub: userId, email, role }, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-access-secret'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    } as JwtSignOptions);
    const refreshToken = await this.jwt.signAsync({ sub: userId }, {
      secret: this.config.get<string>(
        'JWT_REFRESH_SECRET',
        'dev-refresh-secret',
      ),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL', '7d'),
    } as JwtSignOptions);
    return { accessToken, refreshToken };
  }
}
