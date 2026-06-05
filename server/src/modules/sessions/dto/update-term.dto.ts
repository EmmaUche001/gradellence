import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateTermDto } from './create-term.dto';

export class UpdateTermDto extends PartialType(
  OmitType(CreateTermDto, ['sessionId'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
