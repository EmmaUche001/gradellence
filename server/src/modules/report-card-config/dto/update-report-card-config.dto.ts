import { IsString, IsBoolean, IsOptional, IsArray, IsHexColor } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReportCardConfigDto {
  @ApiPropertyOptional({
    enum: ['classic', 'modern', 'detailed', 'primary'],
    example: 'classic',
  })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ example: '#1a56db' })
  @IsHexColor()
  @IsOptional()
  accentColor?: string;

  @ApiPropertyOptional({ example: 'Knowledge is Power' })
  @IsString()
  @IsOptional()
  motto?: string;

  @ApiPropertyOptional({ example: 'Mrs. Adaeze Okonkwo' })
  @IsString()
  @IsOptional()
  principalName?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showRanking?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showCumulative?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showAffective?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPsychomotor?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showTeacherRemark?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPrincipalRemark?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showResumptionDate?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showStamp?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showPoweredBy?: boolean;

  @ApiPropertyOptional({
    example: ['Punctuality', 'Neatness', 'Cooperation'],
  })
  @IsArray()
  @IsOptional()
  affectiveTraits?: string[];

  @ApiPropertyOptional({
    example: ['Drawing', 'Sports', 'Handwriting'],
  })
  @IsArray()
  @IsOptional()
  psychomotorTraits?: string[];

  @ApiPropertyOptional({
    example: 'Results are issued without alteration.',
  })
  @IsString()
  @IsOptional()
  footerText?: string;

  @ApiPropertyOptional({ example: '6th January 2026' })
  @IsString()
  @IsOptional()
  nextTermDate?: string;
}
