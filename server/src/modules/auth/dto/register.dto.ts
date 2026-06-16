import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Springfield Elementary' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  schoolName!: string;

  @ApiProperty({ example: 'springfield-elementary' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  schoolAlias!: string;

  @ApiPropertyOptional({ example: 'plan-id-if-applicable' })
  @IsString()
  @IsOptional()
  planId?: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;
}
