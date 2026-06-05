import { IsString, IsInt, IsUUID, IsOptional, MinLength, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Primary 1' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  level!: number;

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
  classTeacherId?: string;
}
