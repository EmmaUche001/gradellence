import { IsString, IsOptional, IsDateString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'School resumes Monday' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'All students and staff are expected to resume on Monday 20th July.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' })
  @IsDateString()
  date!: string;
}
