import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';
import { CreateEnrollmentDto } from './create-enrollment.dto';

export class UpdateEnrollmentDto extends PartialType(CreateEnrollmentDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
