import { IsString, IsDateString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: '2024/2025' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  name!: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-07-31' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
