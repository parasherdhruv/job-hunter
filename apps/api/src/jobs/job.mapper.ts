import { Job as PrismaJob } from '@prisma/client';
import { Job } from '@job-hunter/shared';

/** Maps a Prisma job row to the shared API shape (dates as ISO strings). */
export function toJobDto(job: PrismaJob): Job {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    workMode: job.workMode,
    description: job.description,
    skills: job.skills,
    minLpa: job.minLpa,
    maxLpa: job.maxLpa,
    source: job.source,
    sourceUrl: job.sourceUrl,
    externalId: job.externalId,
    postedAt: job.postedAt ? job.postedAt.toISOString() : null,
    status: job.status,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
