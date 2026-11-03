import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile() {
    return this.prisma.candidateProfile.findUnique({ where: { id: 'default' } });
  }

  saveProfile(dto: UpdateCandidateDto) {
    return this.prisma.candidateProfile.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...dto },
      update: dto,
    });
  }
}
