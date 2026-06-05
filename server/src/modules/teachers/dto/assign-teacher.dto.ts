import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTeacherDto {
  @ApiProperty({ example: 'teacher-uuid' })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({ example: 'subject-uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: 'class-uuid' })
  @IsUUID()
  classId!: string;
}
