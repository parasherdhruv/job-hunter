import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto) {
    return this.jobsService.create(dto);
  }

  @Get()
  list() {
    return this.jobsService.list();
  }

  @Get('matches')
  matches() {
    return this.jobsService.matches();
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.jobsService.updateStatus(id, dto.status);
  }
}
