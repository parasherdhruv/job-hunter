import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { CandidateController } from './candidate/candidate.controller';
import { CandidateService } from './candidate/candidate.service';
import { JobsController } from './jobs/jobs.controller';
import { JobsService } from './jobs/jobs.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController, CandidateController, JobsController],
  providers: [CandidateService, JobsService],
})
export class AppModule {}
