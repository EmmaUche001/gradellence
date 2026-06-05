import { Module } from '@nestjs/common';
import { GradeScalesService } from './grade-scales.service';
import { GradeScalesController } from './grade-scales.controller';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GradeScalesController],
  providers: [GradeScalesService],
  exports: [GradeScalesService],
})
export class GradeScalesModule {}