import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job, Paginated } from '@job-hunter/shared';
import { normalizeStringList } from '../common/utils/normalize';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { toJobDto } from './job.mapper';

const MAX_SCAN_FOR_DUPLICATES = 500;

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto): Promise<Job> {
    this.assertSalaryRange(dto.minLpa, dto.maxLpa);

    const existing = await this.prisma.job.findUnique({ where: { sourceUrl: dto.sourceUrl } });
    if (existing) {
      throw new ConflictException('A job with this source URL already exists.');
    }

    const duplicate = await this.findLikelyDuplicate(dto.title, dto.company);
    if (duplicate) {
      throw new ConflictException(
        `A job for "${duplicate.title}" at ${duplicate.company} already exists.`,
      );
    }

    const job = await this.prisma.job.create({
      data: {
        title: dto.title.trim(),
        company: dto.company.trim(),
        location: dto.location?.trim() || null,
        workMode: dto.workMode ?? 'UNKNOWN',
        description: dto.description,
        skills: normalizeStringList(dto.skills ?? []),
        minLpa: dto.minLpa ?? null,
        maxLpa: dto.maxLpa ?? null,
        source: dto.source ?? 'MANUAL',
        sourceUrl: dto.sourceUrl,
        externalId: dto.externalId ?? null,
      },
    });
    return toJobDto(job);
  }

  async list(query: ListJobsQueryDto): Promise<Paginated<Job>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.JobWhereInput = {
      ...(query.company
        ? { company: { contains: query.company.trim(), mode: 'insensitive' as const } }
        : {}),
      ...(query.location
        ? { location: { contains: query.location.trim(), mode: 'insensitive' as const } }
        : {}),
      ...(query.workMode ? { workMode: query.workMode } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.minLpa != null ? { OR: [{ maxLpa: { gte: query.minLpa } }, { maxLpa: null }] } : {}),
      ...(query.maxLpa != null ? { minLpa: { lte: query.maxLpa } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { company: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { description: { contains: query.search.trim(), mode: 'insensitive' as const } },
              { skills: { has: query.search.trim() } },
            ],
          }
        : {}),
    };

    const orderBy = this.resolveOrderBy(query.sortBy, query.sortOrder);

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items: items.map(toJobDto),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job not found.');
    return toJobDto(job);
  }

  async update(id: string, dto: UpdateJobDto): Promise<Job> {
    const current = await this.prisma.job.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Job not found.');

    const minLpa = dto.minLpa ?? current.minLpa;
    const maxLpa = dto.maxLpa ?? current.maxLpa;
    this.assertSalaryRange(minLpa ?? undefined, maxLpa ?? undefined);

    if (dto.sourceUrl && dto.sourceUrl !== current.sourceUrl) {
      const clash = await this.prisma.job.findUnique({ where: { sourceUrl: dto.sourceUrl } });
      if (clash) throw new ConflictException('Another job already uses this source URL.');
    }

    const job = await this.prisma.job.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.company !== undefined ? { company: dto.company.trim() } : {}),
        ...(dto.location !== undefined ? { location: dto.location?.trim() || null } : {}),
        ...(dto.workMode !== undefined ? { workMode: dto.workMode } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.skills !== undefined ? { skills: normalizeStringList(dto.skills) } : {}),
        ...(dto.minLpa !== undefined ? { minLpa: dto.minLpa ?? null } : {}),
        ...(dto.maxLpa !== undefined ? { maxLpa: dto.maxLpa ?? null } : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.sourceUrl !== undefined ? { sourceUrl: dto.sourceUrl } : {}),
        ...(dto.externalId !== undefined ? { externalId: dto.externalId ?? null } : {}),
      },
    });
    return toJobDto(job);
  }

  async updateStatus(id: string, status: Job['status']): Promise<Job> {
    const exists = await this.prisma.job.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Job not found.');
    const job = await this.prisma.job.update({ where: { id }, data: { status } });
    return toJobDto(job);
  }

  async remove(id: string): Promise<{ id: string }> {
    const exists = await this.prisma.job.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Job not found.');
    await this.prisma.job.delete({ where: { id } });
    return { id };
  }

  /** Counts jobs per status for the dashboard. */
  async statusCounts(): Promise<Record<string, number>> {
    const grouped = await this.prisma.job.groupBy({ by: ['status'], _count: { _all: true } });
    return grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});
  }

  private assertSalaryRange(min?: number, max?: number): void {
    if (min != null && max != null && min > max) {
      throw new BadRequestException('Minimum salary cannot exceed maximum salary.');
    }
  }

  /**
   * Case-insensitive duplicate detection on title + company. `sourceUrl` has a
   * hard unique constraint; this catches the same role reposted at a new URL.
   */
  private async findLikelyDuplicate(title: string, company: string) {
    const candidates = await this.prisma.job.findMany({
      where: { company: { equals: company.trim(), mode: 'insensitive' } },
      select: { id: true, title: true, company: true },
      take: MAX_SCAN_FOR_DUPLICATES,
    });
    const normalizedTitle = title.trim().toLowerCase();
    return candidates.find((candidate) => candidate.title.trim().toLowerCase() === normalizedTitle) ?? null;
  }

  private resolveOrderBy(
    sortBy: ListJobsQueryDto['sortBy'],
    sortOrder: ListJobsQueryDto['sortOrder'],
  ): Prisma.JobOrderByWithRelationInput {
    const order = sortOrder ?? 'desc';
    switch (sortBy) {
      case 'title':
        return { title: order };
      case 'company':
        return { company: order };
      case 'salary':
        return { maxLpa: order };
      default:
        return { createdAt: order };
    }
  }
}
