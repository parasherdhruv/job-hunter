import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SessionAuthGuard } from './auth/session-auth.guard';
import { CandidateModule } from './candidate/candidate.module';
import { JobsModule } from './jobs/jobs.module';
import { MatchingModule } from './matching/matching.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          { ttl: config.throttleTtlSeconds * 1000, limit: config.throttleLimit },
        ],
      }),
    }),
    AuthModule,
    CandidateModule,
    JobsModule,
    MatchingModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate limiting runs before authentication.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
