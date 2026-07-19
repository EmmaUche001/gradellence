import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaModule } from '../../database/prisma.module';
import { VerifyModule } from '../verify/verify.module';

@Module({
  imports: [PrismaModule, VerifyModule],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
