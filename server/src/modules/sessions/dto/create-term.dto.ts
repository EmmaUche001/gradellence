import {
  IsString,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTermDto {
  @ApiProperty({ example: 'session-uuid' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ example: 'First Term' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2024-12-15' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;
}
