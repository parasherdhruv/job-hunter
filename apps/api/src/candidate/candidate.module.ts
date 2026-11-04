import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { ResumeService } from './resume.service';

@Module({
  controllers: [CandidateController],
  providers: [CandidateService, ResumeService],
  exports: [CandidateService],
})
export class CandidateModule {}
