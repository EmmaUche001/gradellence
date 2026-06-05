import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ResultsModule } from './modules/results/results.module';
import { GradeScalesModule } from './modules/grade-scales/grade-scales.module';
import { HealthModule } from './modules/health/health.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { configValidationSchema } from './config/config.validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: configValidationSchema,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Database
    PrismaModule,

    // Redis (global)
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST') ?? 'localhost',
        port: configService.get('REDIS_PORT') ?? 6379,
        password: configService.get('REDIS_PASSWORD') || undefined,
        db: configService.get('REDIS_DB') ?? 0,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    SchoolsModule,
    UsersModule,
    SessionsModule,
    ClassesModule,
    SubjectsModule,
    StudentsModule,
    TeachersModule,
    EnrollmentsModule,
    AssessmentsModule,
    ResultsModule,
    GradeScalesModule,
    HealthModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
