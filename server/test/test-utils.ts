import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import request from 'supertest';

export interface TestUser {
  id: string;
  email: string;
  schoolId: string;
  accessToken: string;
  refreshToken: string;
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}

export async function cleanupDatabase(prisma: PrismaService): Promise<void> {
  // Clean up in reverse order of dependencies
  const tables = [
    'audit_logs',
    'results',
    'assessments',
    'enrollments',
    'students',
    'teachers',
    'subjects',
    'classes',
    'terms',
    'sessions',
    'grade_scales',
    'users',
    'schools',
  ];

  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table might not exist, skip
    }
  }
}

export function getPrisma(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

export async function registerAndLogin(
  app: INestApplication,
  overrides: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    schoolName?: string;
  } = {},
): Promise<TestUser> {
  const email = overrides.email || `test-${Date.now()}@example.com`;
  const password = overrides.password || 'Password123!';
  const firstName = overrides.firstName || 'Test';
  const lastName = overrides.lastName || 'User';
  const schoolName = overrides.schoolName || `Test School ${Date.now()}`;

  // Register
  const registerRes = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
    schoolId: null, // Will be created
    email,
    password,
    firstName,
    lastName,
  });

  // If registration requires existing school, create one first
  if (registerRes.status === 400) {
    // Create school first via super admin flow
    // For now, use a simpler approach - register with a school
    const schoolRes = await request(app.getHttpServer())
      .post('/api/v1/schools')
      .send({
        name: schoolName,
        slug: `test-school-${Date.now()}`,
      });

    const schoolId = schoolRes.body?.data?.id || schoolRes.body?.id;

    await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      schoolId,
      email,
      password,
      firstName,
      lastName,
    });
  }

  // Login
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  const body = loginRes.body.data || loginRes.body;
  return {
    id: body.user?.id || body.id,
    email,
    schoolId: body.user?.schoolId || body.schoolId,
    accessToken: body.accessToken || body.access_token,
    refreshToken: body.refreshToken || body.refresh_token,
  };
}
