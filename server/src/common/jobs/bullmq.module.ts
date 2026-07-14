import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ResultComputationProcessor } from './processors/result-computation.processor';
import { BulkEnrollmentProcessor } from './processors/bulk-enrollment.processor';
import { EmailProcessor } from './processors/email.processor';
import { ResultsModule } from '../../modules/results/results.module';
import { EnrollmentsModule } from '../../modules/enrollments/enrollments.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'result-computation' },
      { name: 'bulk-enrollment' },
      { name: 'email' },
    ),
    ResultsModule,
    EnrollmentsModule,
  ],
  providers: [ResultComputationProcessor, BulkEnrollmentProcessor, EmailProcessor],
  exports: [BullModule],
})
export class BullMQModule {}
