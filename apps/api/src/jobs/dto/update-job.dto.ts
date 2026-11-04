import { PartialType } from '@nestjs/swagger';
import { CreateJobDto } from './create-job.dto';

/** Every field is optional on update; validation rules mirror creation. */
export class UpdateJobDto extends PartialType(CreateJobDto) {}
