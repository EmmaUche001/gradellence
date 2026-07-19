import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ParentRegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty()
  schoolSlug!: string;

  @IsString()
  @IsNotEmpty()
  admissionNumber!: string;
}
