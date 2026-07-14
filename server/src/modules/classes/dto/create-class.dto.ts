import { Type, Transform } from 'class-transformer';
import { IsString, IsInt, IsUUID, IsOptional, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'JSS1, JSS2, SS1A, SS1B' })
  @IsString()
  names!: string;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  stream?: string;
}

export class BaseClassDto {
  @ApiPropertyOptional({ example: 'Primary 1' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  level?: number;

  @ApiPropertyOptional({ example: 'A' })
  @IsString()
  @IsOptional()
  stream?: string;

  @ApiPropertyOptional({ example: 40 })
  @IsInt()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ example: 'teacher-uuid' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  classTeacherId?: string;
}
