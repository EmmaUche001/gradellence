import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty({ example: 'student-uuid' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ example: 'class-uuid' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ example: 'term-uuid' })
  @IsUUID()
  termId!: string;
}
