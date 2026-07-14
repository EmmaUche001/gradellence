import { IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionWithTermsDto {
  @ApiProperty({ example: '2025/2026' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: '2025-09-01' })
  @IsDateString()
  firstTermStart!: string;

  @ApiProperty({ example: '2025-12-15' })
  @IsDateString()
  firstTermEnd!: string;

  @ApiProperty({ example: '2026-01-06' })
  @IsDateString()
  secondTermStart!: string;

  @ApiProperty({ example: '2026-04-10' })
  @IsDateString()
  secondTermEnd!: string;

  @ApiProperty({ example: '2026-04-27' })
  @IsDateString()
  thirdTermStart!: string;

  @ApiProperty({ example: '2026-07-31' })
  @IsDateString()
  thirdTermEnd!: string;
}
