import { IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateGradeScaleDto } from './create-grade-scale.dto';

export class UpdateGradeScaleEntry {
  @ApiProperty({ type: String, description: 'Grade scale ID to update' })
  id!: string;

  @ApiPropertyOptional({ type: String, description: 'New grade letter' })
  @IsOptional()
  grade?: string;

  @ApiPropertyOptional({ type: Number, description: 'New minimum score' })
  @IsOptional()
  @Type(() => Number)
  minScore?: number;

  @ApiPropertyOptional({ type: Number, description: 'New maximum score' })
  @IsOptional()
  @Type(() => Number)
  maxScore?: number;

  @ApiPropertyOptional({ type: String, description: 'New remark' })
  @IsOptional()
  remark?: string;

  @ApiPropertyOptional({ type: Number, description: 'New grade points for GPA' })
  @IsOptional()
  @Type(() => Number)
  points?: number;

  @ApiPropertyOptional({ type: Boolean, description: 'Is active' })
  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;
}

export class BatchUpdateGradeScaleDto {
  @ApiProperty({ type: [UpdateGradeScaleEntry], description: 'Array of grade scales to update' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateGradeScaleEntry)
  scales!: UpdateGradeScaleEntry[];

  @ApiPropertyOptional({ type: Boolean, description: 'Validate only, do not save' })
  @IsOptional()
  @Type(() => Boolean)
  validateOnly?: boolean;
}

export class BatchCreateGradeScaleDto {
  @ApiProperty({ type: [CreateGradeScaleDto], description: 'Array of grade scales to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGradeScaleDto)
  scales!: CreateGradeScaleDto[];
}
