import { IsString, IsInt, Min, Max, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}