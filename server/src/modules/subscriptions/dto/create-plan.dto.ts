import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: 'Duration in days' })
  @IsNumber()
  @Min(1)
  duration!: number;

  @ApiProperty({ default: 100 })
  @IsNumber()
  @Min(1)
  maxStudents!: number;

  @ApiProperty({ default: 20 })
  @IsNumber()
  @Min(1)
  maxTeachers!: number;

  @ApiProperty({ default: 10 })
  @IsNumber()
  @Min(1)
  maxClasses!: number;

  @ApiPropertyOptional()
  @IsOptional()
  features?: any;
}
