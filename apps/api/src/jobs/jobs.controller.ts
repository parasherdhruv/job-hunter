import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Job, JobMatch, MatchResult, Paginated } from '@job-hunter/shared';
import { MatchingService } from '../matching/matching.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ListJobsQueryDto } from './dto/list-jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly matchingService: MatchingService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a job' })
  create(@Body() dto: CreateJobDto): Promise<Job> {
    return this.jobsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List jobs with pagination and filters' })
  list(@Query() query: ListJobsQueryDto): Promise<Paginated<Job>> {
    return this.jobsService.list(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Counts by application status' })
  stats(): Promise<Record<string, number>> {
    return this.jobsService.statusCounts();
  }

  @Get('matches')
  @ApiOperation({ summary: 'Rank jobs by match score (all jobs)' })
  matches(): Promise<{ matches: JobMatch[]; profileReady: boolean }> {
    return this.matchingService.rankAllJobs();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a single job' })
  findOne(@Param('id') id: string): Promise<Job> {
    return this.jobsService.findOne(id);
  }

  @Get(':id/match')
  @ApiOperation({ summary: 'Explain the match score for a job' })
  match(@Param('id') id: string): Promise<MatchResult | null> {
    return this.matchingService.scoreJobById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a job' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto): Promise<Job> {
    return this.jobsService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the application status of a job' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto): Promise<Job> {
    return this.jobsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job' })
  remove(@Param('id') id: string): Promise<{ id: string }> {
    return this.jobsService.remove(id);
  }
}
