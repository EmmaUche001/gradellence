import { IsUUID, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishResultDto {
  @ApiProperty({ example: 'class-uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsUUID()
  termId!: string;

  @ApiProperty({ example: ['subject-uuid-1', 'subject-uuid-2'], required: false })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];
}
