import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  enabled: !!process.env.SENTRY_DSN,
});

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Get config service
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:5173',
    credentials: true,
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Serve uploaded files (logos, signatures, stamps)
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // Swagger documentation (only in non-production)
  const nodeEnv = configService.get('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Gradellence SRMS API')
      .setDescription(
        'School Result Management System (SRMS) API Documentation.\n\n' +
          '## Authentication\n' +
          'All protected endpoints require a Bearer token in the Authorization header.\n' +
          'Use the `/v1/auth/login` endpoint to obtain an access token.\n\n' +
          '## Rate Limiting\n' +
          'API endpoints are rate-limited. Check response headers for rate limit status.\n\n' +
          '## Multi-Tenancy\n' +
          'All data is isolated by school. The school context is derived from the authenticated user.',
      )
      .setVersion('1.0.0')
      .setContact('Gradellence Support', 'https://gradellence.com', 'support@gradellence.com')
      .setLicense('Proprietary', 'https://gradellence.com/terms')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addServer('http://localhost:3000', 'Local Development')
      .addServer('https://api.staging.gradellence.com', 'Staging')
      .addServer('https://api.gradellence.com', 'Production')
      .addTag('Authentication', 'User registration, login, and token management')
      .addTag('Schools', 'School management (Super Admin only)')
      .addTag('Users', 'User management within a school')
      .addTag('Sessions', 'Academic sessions and terms')
      .addTag('Classes', 'Class management')
      .addTag('Subjects', 'Subject management and teacher assignment')
      .addTag('Students', 'Student enrollment and management')
      .addTag('Teachers', 'Teacher management and class assignment')
      .addTag('Enrollments', 'Student enrollment in classes')
      .addTag('Assessments', 'Student assessment scores')
      .addTag('Results', 'Result computation and publishing')
      .addTag('Grade Scales', 'Grade scale configuration')
      .addTag('Health', 'Health check endpoints')
      .addTag('Audit Logs', 'Audit trail and activity logs')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig, {
      deepScanRoutes: true,
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
      },
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Gradellence SRMS API Docs',
    });
  }

  const port = configService.get('PORT') || 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    console.log(`API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
