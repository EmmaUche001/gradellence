import { IsString, IsInt, IsNumber, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGradeScaleDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  grade!: string;

  @ApiProperty({ example: 70 })
  @IsInt()
  @Min(0)
  @Max(100)
  minScore!: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore!: number;

  @ApiProperty({ example: 'Excellent' })
  @IsString()
  remark!: string;

  @ApiProperty({
    example: 5.0,
    required: false,
    description:
      'Grade points used for GPA calculation on transcripts (e.g. A=5.0, B=4.0). Defaults to 0 if not set.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  points?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
