import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { BaseClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(BaseClassDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
