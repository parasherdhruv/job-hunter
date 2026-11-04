import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Typed accessor for environment configuration. Keeps `process.env` usage out
 * of feature code and centralises the defaults.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  /** `PORT` is injected by hosting platforms such as Railway. */
  get port(): number {
    return Number(this.config.get<number>('PORT') ?? this.config.get<number>('API_PORT') ?? 4000);
  }

  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  get sessionSecret(): string {
    return this.config.getOrThrow<string>('SESSION_SECRET');
  }

  get authUsername(): string {
    return this.config.getOrThrow<string>('AUTH_USERNAME');
  }

  get authPassword(): string {
    return this.config.getOrThrow<string>('AUTH_PASSWORD');
  }

  get sessionTtlDays(): number {
    return Number(this.config.get<number>('SESSION_TTL_DAYS') ?? 14);
  }

  get cookieSameSite(): 'lax' | 'strict' | 'none' {
    return (this.config.get<string>('COOKIE_SAME_SITE') ?? 'lax') as 'lax' | 'strict' | 'none';
  }

  get cookieSecure(): boolean {
    return this.config.get<string>('COOKIE_SECURE') === 'true';
  }

  get cookieDomain(): string | undefined {
    const value = this.config.get<string>('COOKIE_DOMAIN');
    return value && value.length > 0 ? value : undefined;
  }

  get throttleTtlSeconds(): number {
    return Number(this.config.get<number>('THROTTLE_TTL_SECONDS') ?? 60);
  }

  get throttleLimit(): number {
    return Number(this.config.get<number>('THROTTLE_LIMIT') ?? 120);
  }

  get uploadMaxBytes(): number {
    return Number(this.config.get<number>('UPLOAD_MAX_BYTES') ?? 5 * 1024 * 1024);
  }

  /** Explicit list of allowed browser origins; empty means same-origin only. */
  get corsOrigins(): string[] {
    const raw = this.config.get<string>('CORS_ORIGINS') ?? '';
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
}
