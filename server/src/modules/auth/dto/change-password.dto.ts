import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ example: 'NewSecure@2026' })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword!: string;
}
