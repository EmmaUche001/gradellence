import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ParentLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
