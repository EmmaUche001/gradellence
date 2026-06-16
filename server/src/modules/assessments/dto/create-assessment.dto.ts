import { IsString, IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssessmentDto {
  @ApiProperty({ example: 'student-uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 'subject-uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ example: 'CA1', description: 'Assessment type: CA1, CA2, CA3, EXAM' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 75 })
  @IsNumber()
  @Min(0)
  score!: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  maxScore!: number;

  @ApiProperty({ example: 1.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;
}
