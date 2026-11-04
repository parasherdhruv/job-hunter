import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { JobSource, WorkMode } from '@prisma/client';

export class CreateJobDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(200)
  company!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsString()
  @MaxLength(20_000)
  description!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  minLpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxLpa?: number;

  @IsOptional()
  @IsEnum(JobSource)
  source?: JobSource;

  @ValidateIf((_object, value) => value !== undefined && value !== null && value !== '')
  @IsUrl({ require_protocol: true })
  @MaxLength(2000)
  sourceUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  externalId?: string;
}
