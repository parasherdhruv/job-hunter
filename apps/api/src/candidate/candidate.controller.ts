import { Body, Controller, Get, Put } from '@nestjs/common';
import { CandidateService } from './candidate.service';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Controller('candidate')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Get('profile')
  getProfile() {
    return this.candidateService.getProfile();
  }

  @Put('profile')
  saveProfile(@Body() dto: UpdateCandidateDto) {
    return this.candidateService.saveProfile(dto);
  }
}
