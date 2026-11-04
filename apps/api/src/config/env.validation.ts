import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

/**
 * Environment schema. Validated once at boot so misconfiguration fails fast
 * with a readable message instead of a runtime crash later.
 */
export class EnvironmentVariables {
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsOptional()
  @IsIn(['development', 'test', 'production'])
  NODE_ENV?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  API_PORT?: number;

  @IsOptional()
  @IsString()
  CORS_ORIGINS?: string;

  @IsString()
  @MinLength(32, {
    message: 'SESSION_SECRET must be at least 32 characters long',
  })
  SESSION_SECRET!: string;

  @IsString()
  @MinLength(1)
  AUTH_USERNAME!: string;

  @IsString()
  @MinLength(8, { message: 'AUTH_PASSWORD must be at least 8 characters long' })
  AUTH_PASSWORD!: string;

  @IsOptional()
  @IsIn(['lax', 'strict', 'none'])
  COOKIE_SAME_SITE?: string;

  @IsOptional()
  @IsString()
  COOKIE_SECURE?: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  SESSION_TTL_DAYS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_TTL_SECONDS?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number;

  @IsOptional()
  @IsInt()
  @Min(1024)
  UPLOAD_MAX_BYTES?: number;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const instance = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${messages}`);
  }
  return instance;
}
