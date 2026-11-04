import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  id: string;
  username: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private static readonly BCRYPT_ROUNDS = 12;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  /** Ensures the single configured account exists. Runs once at boot. */
  async onModuleInit(): Promise<void> {
    const existing = await this.prisma.user.findFirst({ select: { id: true } });
    if (existing) return;

    const passwordHash = await hash(this.config.authPassword, AuthService.BCRYPT_ROUNDS);
    await this.prisma.user.create({
      data: { username: this.config.authUsername, passwordHash },
    });
    this.logger.log(`Created initial account "${this.config.authUsername}"`);
  }

  async validateCredentials(username: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      // Still perform a hash comparison to keep timing roughly constant.
      await compare(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
      return null;
    }
    const valid = await compare(password, user.passwordHash);
    if (!valid) return null;
    return { id: user.id, username: user.username };
  }

  /**
   * Issues a new session. The raw token is returned to the caller (to be set as
   * a cookie) and only its hash is persisted.
   */
  async createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.config.sessionTtlDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: { tokenHash: this.hashToken(token), userId, expiresAt },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });

    return { token, expiresAt };
  }

  /** Resolves a session token to a user, or null when invalid/expired. */
  async resolveSession(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { select: { id: true, username: true } } },
    });

    if (!session) return null;
    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    return { id: session.user.id, username: session.user.username };
  }

  async destroySession(token: string): Promise<void> {
    await this.prisma.session
      .deleteMany({ where: { tokenHash: this.hashToken(token) } })
      .catch(() => undefined);
  }

  async purgeExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }

  private hashToken(token: string): string {
    // Session tokens are high-entropy random values, so a fast hash is
    // sufficient here and avoids bcrypt cost on every authenticated request.
    return createHash('sha256').update(`${token}${this.config.sessionSecret}`).digest('hex');
  }

  /** Constant-time comparison helper kept for tests and future token checks. */
  static safeEqual(a: string, b: string): boolean {
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    if (bufferA.length !== bufferB.length) return false;
    return timingSafeEqual(bufferA, bufferB);
  }
}
