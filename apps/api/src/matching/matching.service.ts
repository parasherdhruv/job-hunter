import { Injectable, Logger } from '@nestjs/common';
import { CandidateProfile, Job } from '@prisma/client';
import { JobMatch, MatchResult } from '@job-hunter/shared';
import { PrismaService } from '../prisma/prisma.service';
import { scoreJob } from './scoring';
import { toJobDto } from '../jobs/job.mapper';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Scores a single job against a candidate profile. */
  scoreOne(candidate: CandidateProfile, job: Job): MatchResult {
    return scoreJob(
      {
        yearsExperience: candidate.yearsExperience,
        skills: candidate.skills,
        preferredTitles: candidate.preferredTitles,
        preferredLocations: candidate.preferredLocations,
        remoteOpen: candidate.remoteOpen,
        targetMinLpa: candidate.targetMinLpa,
        targetMaxLpa: candidate.targetMaxLpa,
      },
      {
        title: job.title,
        location: job.location,
        workMode: job.workMode,
        skills: job.skills,
        minLpa: job.minLpa,
        maxLpa: job.maxLpa,
      },
    );
  }

  /** Scores every job in the database and returns them ranked by score. */
  async rankAllJobs(): Promise<{ matches: JobMatch[]; profileReady: boolean }> {
    const [candidate, jobs] = await Promise.all([
      this.prisma.candidateProfile.findUnique({ where: { id: 'default' } }),
      this.prisma.job.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    if (!candidate) {
      return { matches: [], profileReady: false };
    }

    const matches = jobs
      .map((job) => ({ job: toJobDto(job), ...this.scoreOne(candidate, job) }))
      .sort((a, b) => b.score - a.score || a.job.title.localeCompare(b.job.title));

    return { matches, profileReady: true };
  }

  /** Scores a single job by id. */
  async scoreJobById(jobId: string): Promise<MatchResult | null> {
    const [candidate, job] = await Promise.all([
      this.prisma.candidateProfile.findUnique({ where: { id: 'default' } }),
      this.prisma.job.findUnique({ where: { id: jobId } }),
    ]);
    if (!candidate || !job) return null;
    return this.scoreOne(candidate, job);
  }
}
