import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidateProfile } from '@job-hunter/shared';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { CandidateService } from './candidate.service';
import { ResumeService } from './resume.service';

@ApiTags('candidate')
@Controller('candidate')
export class CandidateController {
  constructor(
    private readonly candidateService: CandidateService,
    private readonly resumeService: ResumeService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Read the candidate profile' })
  getProfile(): Promise<CandidateProfile | null> {
    return this.candidateService.getProfile();
  }

  @Put('profile')
  @ApiOperation({ summary: 'Create or update the candidate profile' })
  saveProfile(@Body() dto: UpdateCandidateDto): Promise<CandidateProfile> {
    return this.candidateService.saveProfile(dto);
  }

  @Post('resume')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a resume (PDF, DOC or DOCX, max 5 MB)' })
  async uploadResume(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<CandidateProfile> {
    return this.resumeService.store(file);
  }

  @Delete('resume')
  @ApiOperation({ summary: 'Remove the stored resume' })
  removeResume(): Promise<CandidateProfile> {
    return this.candidateService.clearResume();
  }
}
