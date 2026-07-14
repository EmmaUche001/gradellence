import { IsString, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromoteStudentsDto {
  @ApiProperty({ example: 'class-uuid-from' })
  @IsString()
  @IsUUID()
  fromClassId!: string;

  @ApiProperty({ example: 'class-uuid-to' })
  @IsString()
  @IsUUID()
  toClassId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsString()
  @IsUUID()
  termId!: string;

  @ApiProperty({ example: 'term-uuid-next' })
  @IsString()
  @IsUUID()
  nextTermId!: string;

  @ApiPropertyOptional({ example: ['student-uuid-1', 'student-uuid-2'], type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  studentIds?: string[];
}