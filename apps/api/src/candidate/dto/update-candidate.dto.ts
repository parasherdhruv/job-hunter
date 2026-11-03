import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCandidateDto {
  @IsOptional() @IsString() headline?: string;
  @IsOptional() @IsNumber() @Min(0) yearsExperience?: number;
  @IsOptional() @IsNumber() @Min(0) targetMinLpa?: number;
  @IsOptional() @IsNumber() @Min(0) targetMaxLpa?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preferredLocations?: string[];
  @IsOptional() @IsBoolean() remoteOpen?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @IsString() resumeText?: string;
}
