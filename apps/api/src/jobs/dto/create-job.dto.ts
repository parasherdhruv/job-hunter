import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { JobSource, WorkMode } from '@prisma/client';

export class CreateJobDto {
  @IsString() title!: string;
  @IsString() company!: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsString() description!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsNumber() @Min(0) minLpa?: number;
  @IsOptional() @IsNumber() @Min(0) maxLpa?: number;
  @IsOptional() @IsEnum(JobSource) source?: JobSource;
  @IsUrl() sourceUrl!: string;
  @IsOptional() @IsString() externalId?: string;
}
