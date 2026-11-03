import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { scoreJob } from './scoring';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateJobDto) {
    return this.prisma.job.create({ data: dto });
  }

  list() {
    return this.prisma.job.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async matches() {
    const [candidate, jobs] = await Promise.all([
      this.prisma.candidateProfile.findUnique({ where: { id: 'default' } }),
      this.prisma.job.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    ]);
    if (!candidate) return { message: 'Create your candidate profile first.', matches: [] };
    return {
      matches: jobs
        .map((job) => ({ job, ...scoreJob(candidate, job) }))
        .sort((a, b) => b.score - a.score),
    };
  }

  async updateStatus(id: string, status: any) {
    const exists = await this.prisma.job.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Job not found');
    return this.prisma.job.update({ where: { id }, data: { status } });
  }
}
