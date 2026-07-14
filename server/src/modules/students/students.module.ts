import { Module } from '@nestjs/common';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { PrismaModule } from '../../database/prisma.module';
import { ExportModule } from '../../common/export/export.module';

@Module({
  imports: [PrismaModule, ExportModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
