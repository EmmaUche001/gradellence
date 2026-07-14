import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import request from 'supertest';

/**
 * Endpoint coverage + security e2e suite.
 * Exercises every controller route; verifies auth gating (401),
 * RBAC (403), cross-tenant isolation, and happy paths.
 */

const PW = 'Password123!';

async function registerSchool(
  app: INestApplication,
  schoolName: string,
  alias: string,
  email: string,
) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ schoolName, schoolAlias: alias, email, password: PW, firstName: 'Admin', lastName: 'User' })
    .expect(201);
  return res.body.data;
}

async function login(app: INestApplication, email: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: PW })
    .expect(200);
  return res.body.data.accessToken as string;
}

describe('SRMS Endpoint Coverage & Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenA: string;
  let tokenB: string;
  let schoolAId: string;
  let schoolBId: string;
  let studentAId: string;
  let classAId: string;
  let subjectAId: string;
  let sessionAId: string;
  let termAId: string;
  let gradeScaleAId: string;
  let teacherId: string;

  const get = (path: string, token?: string) => {
    const r = request(app.getHttpServer()).get(path);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };
  const post = (path: string, token?: string, body?: unknown) => {
    const r = request(app.getHttpServer()).post(path);
    if (token) r.set('Authorization', `Bearer ${token}`);
    return r.send(body ?? {});
  };
  const patch = (path: string, token?: string, body?: unknown) => {
    const r = request(app.getHttpServer()).patch(path);
    if (token) r.set('Authorization', `Bearer ${token}`);
    return r.send(body ?? {});
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);

    const a = await registerSchool(app, 'School A', 'school-a-' + Date.now(), `admin-a-${Date.now()}@test.com`);
    const b = await registerSchool(app, 'School B', 'school-b-' + Date.now(), `admin-b-${Date.now()}@test.com`);
    tokenA = a.accessToken;
    tokenB = b.accessToken;
    schoolAId = a.user.schoolId;
    schoolBId = b.user.schoolId;
  }, 60000);

  afterAll(async () => {
    try {
      await prisma.auditLog.deleteMany({ where: { actorId: { in: [schoolAId, schoolBId] } } });
      await prisma.documentVerification.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.assessment.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.result.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.enrollment.deleteMany({ where: { student: { schoolId: { in: [schoolAId, schoolBId] } } } });
      await prisma.student.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.class.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.subject.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.term.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.session.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.gradeScale.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.user.deleteMany({ where: { schoolId: { in: [schoolAId, schoolBId] } } });
      await prisma.school.deleteMany({ where: { id: { in: [schoolAId, schoolBId] } } });
    } catch {
      /* ignore */
    }
    await app.close();
  });

  describe('Health', () => {
    it('GET /api/v1/health → 200 (public)', async () => {
      await get('/api/v1/health').expect(200);
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/register → 201', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          schoolName: 'Temp School',
          schoolAlias: 'temp-school-' + Date.now(),
          email: `temp-${Date.now()}@test.com`,
          password: PW,
          firstName: 'T',
          lastName: 'U',
        })
        .expect(201);
    });
    it('POST /api/v1/auth/login → 401 bad creds', async () => {
      await post('/api/v1/auth/login', undefined, { email: 'nope@x.com', password: 'bad' }).expect(401);
    });
    it('POST /api/v1/auth/logout → 401 without token', async () => {
      await post('/api/v1/auth/logout').expect(401);
    });
    it('POST /api/v1/auth/forgot-password → 200', async () => {
      await post('/api/v1/auth/forgot-password', undefined, { email: 'x@y.com' }).expect(200);
    });
    it('POST /api/v1/auth/reset-password → 400 bad token', async () => {
      await post('/api/v1/auth/reset-password', undefined, { token: 'bad', newPassword: PW }).expect(400);
    });
    it('POST /api/v1/auth/verify-email → 400 bad token', async () => {
      await post('/api/v1/auth/verify-email', undefined, { token: 'bad' }).expect(400);
    });
    it('POST /api/v1/auth/refresh → 401 bad token', async () => {
      await post('/api/v1/auth/refresh', undefined, { refreshToken: 'bad' }).expect(401);
    });
  });

  describe('Auth Gating (401 without token)', () => {
    const protectedGets = [
      '/api/v1/schools',
      '/api/v1/users',
      '/api/v1/sessions',
      '/api/v1/classes',
      '/api/v1/subjects',
      '/api/v1/students',
      '/api/v1/teachers',
      '/api/v1/enrollments',
      '/api/v1/assessments',
      '/api/v1/results',
      '/api/v1/grade-scales',
      '/api/v1/analytics/overview',
      '/api/v1/audit-logs',
      '/api/v1/subscriptions/plans',
      '/api/v1/subscriptions/my-plan',
      '/api/v1/billing/invoices',
      '/api/v1/notifications/preferences',
      '/api/v1/parents/students',
      '/api/v1/verify/somehash',
    ];
    for (const p of protectedGets) {
      it(`GET ${p} → 401`, async () => {
        await get(p).expect(401);
      });
    }
  });

  describe('RBAC (403 wrong role)', () => {
    let teacherToken: string;
    beforeAll(async () => {
      const email = `teacher-a-${Date.now()}@test.com`;
      await post('/api/v1/users', tokenA, {
        email,
        password: PW,
        firstName: 'Teach',
        lastName: 'Er',
        roles: ['TEACHER'],
      }).expect(201);
      teacherToken = await login(app, email);
    });
    it('POST /api/v1/students as TEACHER → 403', async () => {
      await post('/api/v1/students', teacherToken, {
        firstName: 'S',
        lastName: 'T',
        admissionNumber: 'X1',
        gender: 'M',
      }).expect(403);
    });
    it('GET /api/v1/students as TEACHER → 200', async () => {
      await get('/api/v1/students', teacherToken).expect(200);
    });
  });

  describe('Core resources + tenant isolation', () => {
    it('SESSIONS: create', async () => {
      const res = await post('/api/v1/sessions', tokenA, {
        name: '2025/2026',
        startDate: '2025-09-01',
        endDate: '2026-07-31',
      }).expect(201);
      sessionAId = res.body.data.id;
    });

    it('TERMS: create under session', async () => {
      const res = await post(`/api/v1/sessions/${sessionAId}/terms`, tokenA, {
        name: 'First Term',
        startDate: '2025-09-01',
        endDate: '2025-12-20',
      }).expect(201);
      termAId = res.body.data.id;
    });

    it('CLASSES: create', async () => {
      const res = await post('/api/v1/classes', tokenA, {
        name: 'JSS 1',
        level: 7,
        stream: 'A',
        capacity: 30,
      }).expect(201);
      classAId = res.body.data.id;
    });

    it('SUBJECTS: create + assign to class', async () => {
      const res = await post('/api/v1/subjects', tokenA, {
        name: 'Mathematics',
        code: 'MTH',
      }).expect(201);
      subjectAId = res.body.data.id;
      await post('/api/v1/subjects/assign', tokenA, {
        subjectId: subjectAId,
        classId: classAId,
      }).expect(201);
    });

    it('GRADE SCALES: create + activate', async () => {
      const res = await post('/api/v1/grade-scales', tokenA, {
        grade: 'A',
        minScore: 70,
        maxScore: 100,
        remark: 'Excellent',
        points: 5,
      }).expect(201);
      gradeScaleAId = res.body.data.id;
      await patch(`/api/v1/grade-scales/${gradeScaleAId}/activate`, tokenA).expect(200);
    });

    it('USERS: create teacher', async () => {
      const res = await post('/api/v1/users', tokenA, {
        email: `assess-teacher-${Date.now()}@test.com`,
        password: PW,
        firstName: 'Assess',
        lastName: 'Teacher',
        roles: ['TEACHER'],
      }).expect(201);
      const tLogin = await login(app, res.body.data.email);
      const tMe = await get('/api/v1/users/me', tLogin).expect(200);
      teacherId = tMe.body.data.id;
    });

    it('STUDENTS: create + cross-tenant isolation', async () => {
      const res = await post('/api/v1/students', tokenA, {
        firstName: 'Alice',
        lastName: 'Ada',
        admissionNumber: 'A001',
        gender: 'F',
      }).expect(201);
      studentAId = res.body.data.id;

      const listB = await get('/api/v1/students', tokenB).expect(200);
      const idsB = Array.isArray(listB.body.data)
        ? listB.body.data.map((s: any) => s.id)
        : (listB.body.data?.items ?? []).map((s: any) => s.id);
      expect(idsB).not.toContain(studentAId);

      await get(`/api/v1/students/${studentAId}`, tokenB).expect(404);
    });

    it('ENROLLMENTS: create', async () => {
      await post('/api/v1/enrollments', tokenA, {
        studentId: studentAId,
        classId: classAId,
        termId: termAId,
      }).expect(201);
    });

    it('ASSESSMENTS: create', async () => {
      await post('/api/v1/assessments', tokenA, {
        studentId: studentAId,
        subjectId: subjectAId,
        termId: termAId,
        teacherId,
        type: 'CA1',
        score: 15,
        maxScore: 20,
        weight: 1,
      }).expect(201);
    });

    it('RESULTS: compute + tenant-isolated list', async () => {
      await post('/api/v1/results/compute/' + classAId + '/' + termAId, tokenA).expect((res: any) =>
        [200, 201].includes(res.status),
      );
      const res = await get('/api/v1/results', tokenA).expect(200);
      expect(res.body).toBeDefined();

      const resB = await get('/api/v1/results', tokenB).expect(200);
      const idsB = Array.isArray(resB.body.data)
        ? resB.body.data.map((r: any) => r.id)
        : (resB.body.data?.items ?? []).map((r: any) => r.id);
      const idsA = Array.isArray(res.body.data)
        ? (res.body.data ?? []).map((r: any) => r.id)
        : (res.body.data?.items ?? []).map((r: any) => r.id);
      if (idsA.length) expect(idsB).not.toContain(idsA[0]);
    });

    it('ANALYTICS: overview', async () => {
      await get('/api/v1/analytics/overview', tokenA).expect(200);
    });

    it('NOTIFICATIONS: preferences get/patch', async () => {
      await get('/api/v1/notifications/preferences', tokenA).expect(200);
      await patch('/api/v1/notifications/preferences', tokenA, { email: true }).expect(200);
    });

    it('VERIFY: unknown hash → 404', async () => {
      await get('/api/v1/verify/nonexistent-hash', tokenA).expect(404);
    });

    it('AUDIT LOGS: list own', async () => {
      await get('/api/v1/audit-logs?page=1&limit=20', tokenA).expect(200);
    });

    it('SUBSCRIPTIONS: list plans + my-plan', async () => {
      await get('/api/v1/subscriptions/plans', tokenA).expect(200);
      await get('/api/v1/subscriptions/my-plan', tokenA).expect(200);
    });

    it('BILLING: invoices list + public-key', async () => {
      await get('/api/v1/billing/invoices', tokenA).expect(200);
      await get('/api/v1/billing/config/public-key', tokenA).expect(200);
    });
  });

  describe('Parents', () => {
    it('POST /api/v1/parents/register → 201', async () => {
      await post('/api/v1/parents/register', undefined, {
        email: `parent-${Date.now()}@test.com`,
        password: PW,
        firstName: 'P',
        lastName: 'A',
        schoolSlug: 'school-a',
        admissionNumber: 'A001',
      }).expect(201);
    });
    it('POST /api/v1/parents/login → 401 bad creds', async () => {
      await post('/api/v1/parents/login', undefined, { email: 'x', password: 'y' }).expect(401);
    });
    it('GET /api/v1/parents/students → 401 without token', async () => {
      await get('/api/v1/parents/students').expect(401);
    });
  });
});