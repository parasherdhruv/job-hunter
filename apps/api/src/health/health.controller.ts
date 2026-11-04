import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface HealthPayload {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: { database: 'up' | 'down' };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liveness/readiness probe. Returns 200 when the database is reachable and
   * 503 when it is not, so platform health checks can act on it.
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Service and database health' })
  async check(@Res({ passthrough: true }) response: Response): Promise<HealthPayload> {
    const databaseUp = await this.prisma.isHealthy();
    if (!databaseUp) response.status(HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: databaseUp ? 'ok' : 'degraded',
      service: 'autonomous-job-hunter-api',
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database: databaseUp ? 'up' : 'down' },
    };
  }
}
