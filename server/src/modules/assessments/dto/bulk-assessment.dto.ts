import { IsUUID, IsArray, ValidateNested, ArrayMinSize, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AssessmentItemDto {
  @ApiProperty({ example: 'student-uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 'CA1', description: 'Assessment type: CA1, CA2, CA3, EXAM' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(1)
  maxScore!: number;
}

export class BulkAssessmentDto {
  @ApiProperty({ example: 'subject-uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ type: [AssessmentItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssessmentItemDto)
  assessments!: AssessmentItemDto[];
}
