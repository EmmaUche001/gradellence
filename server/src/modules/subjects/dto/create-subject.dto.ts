import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'MATH' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code!: string;

  @ApiPropertyOptional({ example: 'Study of numbers, quantities, and shapes' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class BulkCreateSubjectDto {
  @ApiProperty({
    example: [
      { name: 'Mathematics', code: 'MAT1' },
      { name: 'English Language', code: 'ENG1' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubjectDto)
  subjects!: CreateSubjectDto[];
}
