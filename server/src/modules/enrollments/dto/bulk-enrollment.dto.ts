import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkEnrollmentDto {
  @ApiProperty({ example: ['student-uuid-1', 'student-uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  studentIds!: string[];

  @ApiProperty({ example: 'class-uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsUUID()
  termId!: string;
}
