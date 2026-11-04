import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Boots a real Nest application against the test schema. Uses the actual
 * database (no mocks) so guards, validation, filters and Prisma behaviour are
 * all exercised together.
 *
 * The response interceptor, exception filter, auth guard and rate limiter are
 * registered globally by `AppModule`; this helper only adds the HTTP-level
 * pieces that live in `main.ts` (prefix, cookie parsing, validation pipe).
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = moduleRef.createNestApplication();
  const prisma = app.get(PrismaService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return { app, prisma };
}

/**
 * Clears mutable data between tests. The single `User` row is bootstrapped by
 * `AuthService` at startup and is intentionally preserved.
 */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.job.deleteMany();
  await prisma.session.deleteMany();
  await prisma.candidateProfile.deleteMany();
}
