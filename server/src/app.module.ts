import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
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
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { ParentsModule } from './modules/parents/parents.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { VerifyModule } from './common/verify/verify.module';
import { ReportCardConfigModule } from './modules/report-card-config/report-card-config.module';
import { configValidationSchema } from './config/config.validation';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { BullMQModule } from './common/jobs/bullmq.module';
import { DomainEventsModule } from './common/events/domain-events.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: configValidationSchema,
    }),

    // Database
    PrismaModule,

    // Domain events (decouples side effects from core services)
    DomainEventsModule,

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

    // Job processing
    BullMQModule,

    // Scheduled tasks (term auto-advance etc.)
    ScheduleModule.forRoot(),

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
    SubscriptionsModule,
    BillingModule,
    ParentsModule,
    AnalyticsModule,
    NotificationsModule,
    AnnouncementsModule,
    SuperAdminModule,
    VerifyModule,
    ReportCardConfigModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}
