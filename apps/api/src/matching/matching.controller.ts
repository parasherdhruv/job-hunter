import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobMatch, MatchResult } from '@job-hunter/shared';
import { MatchingService } from './matching.service';

@ApiTags('matching')
@Controller('matches')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get()
  @ApiOperation({ summary: 'Rank all jobs by explainable match score' })
  rankAll(): Promise<{ matches: JobMatch[]; profileReady: boolean }> {
    return this.matchingService.rankAllJobs();
  }

  @Get(':jobId')
  @ApiOperation({ summary: 'Explain the match score for a single job' })
  async scoreOne(@Param('jobId') jobId: string): Promise<MatchResult | null> {
    return this.matchingService.scoreJobById(jobId);
  }
}
