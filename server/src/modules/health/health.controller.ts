import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';
import * as nodemailer from 'nodemailer';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'Check API health and database connectivity' })
  async check() {
    const start = Date.now();
    let dbStatus: string;
    let dbLatency: number;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
      dbLatency = -1;
    }
    return {
      success: true,
      message: 'Health check completed',
      data: {
        status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: { status: dbStatus, latencyMs: dbLatency },
        memory: {
          heapUsed: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
          unit: 'MB',
        },
        responseTimeMs: Date.now() - start,
      },
    };
  }

  @Get('email-test')
  @SkipAuth()
  @ApiOperation({ summary: 'Test SMTP connection and send a test email' })
  async testEmail(@Query('to') to: string) {
    if (!to) {
      return { success: false, error: 'Provide ?to=your@email.com in the query' };
    }

    const host = this.configService.get('SMTP_HOST');
    const port = Number(this.configService.get('SMTP_PORT')) || 587;
    const user = this.configService.get('SMTP_USER');
    const pass = this.configService.get('SMTP_PASS');
    const from = this.configService.get('SMTP_FROM');

    if (!host || !user || !pass) {
      return { success: false, error: 'SMTP not configured', config: { host, user, hasPass: !!pass } };
    }

    const transporter = nodemailer.createTransport({
      host, port, secure: false, requireTLS: true,
      auth: { user, pass },
    });

    try {
      // Verify connection first
      await transporter.verify();

      // Send test email
      const info = await transporter.sendMail({
        from,
        to,
        subject: 'Gradellence SMTP Test',
        html: '<p>SMTP is working correctly. This is a test email from Gradellence.</p>',
      });

      return {
        success: true,
        message: `Test email sent to ${to}`,
        messageId: info.messageId,
        config: { host, port, user, from },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        code: err.code,
        config: { host, port, user, from },
      };
    }
  }
}
