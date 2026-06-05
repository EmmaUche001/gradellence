import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignSubjectDto {
  @ApiProperty({ example: 'subject-uuid' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ example: 'class-uuid' })
  @IsUUID()
  classId!: string;
}
