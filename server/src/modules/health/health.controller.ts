import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../database/prisma.service';
import { SkipAuth } from '../../common/decorators/skip-auth.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
          unit: 'MB',
        },
        responseTimeMs: Date.now() - start,
      },
    };
  }
}