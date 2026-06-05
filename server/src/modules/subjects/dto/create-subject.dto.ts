import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'MATH' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code!: string;

  @ApiPropertyOptional({ example: 'Study of numbers, quantities, and shapes' })
  @IsString()
  @IsOptional()
  description?: string;
}
