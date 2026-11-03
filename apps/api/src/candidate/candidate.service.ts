import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CandidateProfile as PrismaCandidateProfile } from '@prisma/client';
import { CandidateProfile, ProfileCompleteness } from '@job-hunter/shared';
import { normalizeStringList } from '../common/utils/normalize';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

export const CANDIDATE_PROFILE_ID = 'default';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(): Promise<CandidateProfile | null> {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { id: CANDIDATE_PROFILE_ID },
    });
    return profile ? this.toDto(profile) : null;
  }

  async saveProfile(dto: UpdateCandidateDto): Promise<CandidateProfile> {
    this.assertSalaryRange(dto);

    const data = {
      ...dto,
      ...(dto.skills ? { skills: normalizeStringList(dto.skills) } : {}),
      ...(dto.preferredTitles ? { preferredTitles: normalizeStringList(dto.preferredTitles) } : {}),
      ...(dto.preferredLocations
        ? { preferredLocations: normalizeStringList(dto.preferredLocations) }
        : {}),
    };

    const profile = await this.prisma.candidateProfile.upsert({
      where: { id: CANDIDATE_PROFILE_ID },
      create: { id: CANDIDATE_PROFILE_ID, ...data },
      update: data,
    });
    return this.toDto(profile);
  }

  async saveResume(fileName: string, text: string): Promise<CandidateProfile> {
    const profile = await this.prisma.candidateProfile.upsert({
      where: { id: CANDIDATE_PROFILE_ID },
      create: { id: CANDIDATE_PROFILE_ID, resumeFileName: fileName, resumeText: text },
      update: { resumeFileName: fileName, resumeText: text },
    });
    return this.toDto(profile);
  }

  async clearResume(): Promise<CandidateProfile> {
    const existing = await this.prisma.candidateProfile.findUnique({
      where: { id: CANDIDATE_PROFILE_ID },
    });
    if (!existing) throw new NotFoundException('No candidate profile exists yet.');

    const profile = await this.prisma.candidateProfile.update({
      where: { id: CANDIDATE_PROFILE_ID },
      data: { resumeFileName: null, resumeText: null },
    });
    return this.toDto(profile);
  }

  /** Profile used by the matching engine; may be null before first setup. */
  async getRawProfile(): Promise<PrismaCandidateProfile | null> {
    return this.prisma.candidateProfile.findUnique({ where: { id: CANDIDATE_PROFILE_ID } });
  }

  private assertSalaryRange(dto: UpdateCandidateDto): void {
    if (dto.targetMinLpa != null && dto.targetMaxLpa != null && dto.targetMinLpa > dto.targetMaxLpa) {
      throw new BadRequestException('Minimum salary expectation cannot exceed the maximum.');
    }
  }

  private toDto(profile: PrismaCandidateProfile): CandidateProfile {
    return {
      id: profile.id,
      name: profile.name,
      headline: profile.headline,
      yearsExperience: profile.yearsExperience,
      skills: profile.skills,
      preferredTitles: profile.preferredTitles,
      preferredLocations: profile.preferredLocations,
      remoteOpen: profile.remoteOpen,
      targetMinLpa: profile.targetMinLpa,
      targetMaxLpa: profile.targetMaxLpa,
      resumeFileName: profile.resumeFileName,
      resumeText: profile.resumeText,
      completeness: this.computeCompleteness(profile),
      updatedAt: profile.updatedAt.toISOString(),
      createdAt: profile.createdAt.toISOString(),
    };
  }

  /**
   * Weighted profile completeness indicator. Each field contributes a share of
   * 100 and any field not yet filled in is reported in `missing`.
   */
  computeCompleteness(profile: PrismaCandidateProfile): ProfileCompleteness {
    const checks: Array<{ label: string; weight: number; done: boolean }> = [
      { label: 'Name', weight: 10, done: Boolean(profile.name?.trim()) },
      { label: 'Professional headline', weight: 10, done: Boolean(profile.headline?.trim()) },
      { label: 'Years of experience', weight: 15, done: profile.yearsExperience > 0 },
      { label: 'Technical skills', weight: 25, done: profile.skills.length > 0 },
      { label: 'Preferred job titles', weight: 10, done: profile.preferredTitles.length > 0 },
      { label: 'Preferred locations', weight: 10, done: profile.preferredLocations.length > 0 },
      {
        label: 'Salary expectations',
        weight: 10,
        done: profile.targetMinLpa != null && profile.targetMaxLpa != null,
      },
      { label: 'Resume', weight: 10, done: Boolean(profile.resumeFileName) },
    ];

    const score = checks.filter((check) => check.done).reduce((sum, check) => sum + check.weight, 0);
    const missing = checks.filter((check) => !check.done).map((check) => check.label);

    return { score, missing };
  }
}
