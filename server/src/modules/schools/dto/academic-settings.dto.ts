import { IsOptional, IsString, IsInt, IsBoolean, IsIn, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAcademicSettingsDto {
  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'LETTER', 'GPA'], description: 'Grading system type' })
  @IsOptional()
  @IsString()
  @IsIn(['PERCENTAGE', 'LETTER', 'GPA'])
  gradingSystem?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Minimum pass mark' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  passMark?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Continuous Assessment weight (%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  caWeight?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: 'Exam weight (%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  examWeight?: number;

  @ApiPropertyOptional({ minimum: 1, description: 'Maximum possible score' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Show student position on results' })
  @IsOptional()
  @IsBoolean()
  showPosition?: boolean;

  @ApiPropertyOptional({ description: 'Show grade on results' })
  @IsOptional()
  @IsBoolean()
  showGrade?: boolean;

  @ApiPropertyOptional({ description: 'Show remark on results' })
  @IsOptional()
  @IsBoolean()
  showRemark?: boolean;

  @ApiPropertyOptional({ enum: ['STANDARD', 'DETAILED', 'COMPACT'], description: 'Result template style' })
  @IsOptional()
  @IsString()
  @IsIn(['STANDARD', 'DETAILED', 'COMPACT'])
  resultTemplate?: string;
}
