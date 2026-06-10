import { IsString, IsOptional, IsUrl, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Springfield Elementary' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'springfield-elementary' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  slug!: string;

  @ApiPropertyOptional({
    example: 'springfield',
    description:
      'Optional human-friendly alias. If provided during registration it will be normalized into the school slug. Only lowercase letters, numbers and hyphens are allowed in the resulting slug.',
  })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(50)
  alias?: string;

  @ApiPropertyOptional({ example: '123 Main St, Springfield' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'info@springfield.edu' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsUrl()
  @IsOptional()
  logo?: string;
}
