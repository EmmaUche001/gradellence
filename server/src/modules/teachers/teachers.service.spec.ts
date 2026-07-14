import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { TeachersService } from './teachers.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/types/express.types';

// Mock the trial-limits helper so create() tests don't need full Prisma setup
jest.mock('../../common/helpers/trial-limits.helper', () => ({
  enforceEntityLimit: jest.fn().mockResolvedValue(undefined),
}));

/** Minimal AuthenticatedUser fixture used across tests */
const currentUser: AuthenticatedUser = {
  id: 'user-1',
  schoolId: 'school-1',
  email: 'admin@school1.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['SCHOOL_ADMIN'],
  permissions: [],
};

/** Factory that produces a fresh plain-object mock for PrismaService */
function createPrismaMock() {
  return {
    teacher: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      create: jest.fn(),
    },
    class: {
      count: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    subject: {
      findFirst: jest.fn(),
    },
    teacherSubject: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

/** Mock BullMQ email queue */
const mockEmailQueue = {
  add: jest.fn().mockResolvedValue(undefined),
};

describe('TeachersService', () => {
  let service: TeachersService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('email'), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // findAll() — Requirement 2.34
  // ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('includes schoolId: currentUser.schoolId in the Prisma where clause', async () => {
      // Validates: Requirement 2.34
      prisma.teacher.findMany.mockResolvedValue([]);
      prisma.teacher.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.teacher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: currentUser.schoolId }),
        }),
      );
    });

    it('also filters deletedAt: null', async () => {
      prisma.teacher.findMany.mockResolvedValue([]);
      prisma.teacher.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.teacher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('returns paginated result with success flag and meta', async () => {
      const fakeTeachers = [{ id: 'teacher-1', schoolId: 'school-1' }];
      prisma.teacher.findMany.mockResolvedValue(fakeTeachers);
      prisma.teacher.count.mockResolvedValue(1);

      const result = await service.findAll(currentUser, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fakeTeachers);
      expect(result.meta.total).toBe(1);
    });

    it('applies search filter when search param is provided', async () => {
      prisma.teacher.findMany.mockResolvedValue([]);
      prisma.teacher.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10, 'John');

      expect(prisma.teacher.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: currentUser.schoolId,
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // findOne() — Requirement 2.35
  // ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('throws NotFoundException when teacher belongs to a different school (findFirst returns null)', async () => {
      // Validates: Requirement 2.35
      // Prisma returns null because the query includes schoolId: currentUser.schoolId
      // and the requested teacher belongs to a different school
      prisma.teacher.findFirst.mockResolvedValue(null);

      await expect(service.findOne('teacher-from-other-school', currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException with correct message', async () => {
      prisma.teacher.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', currentUser)).rejects.toThrow(
        'Teacher not found',
      );
    });

    it('passes schoolId: currentUser.schoolId in the where clause to enforce tenant isolation', async () => {
      prisma.teacher.findFirst.mockResolvedValue(null);

      await expect(service.findOne('teacher-1', currentUser)).rejects.toThrow(NotFoundException);

      expect(prisma.teacher.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'teacher-1',
            schoolId: currentUser.schoolId,
          }),
        }),
      );
    });

    it('returns teacher data when found in the same school', async () => {
      const fakeTeacher = {
        id: 'teacher-1',
        schoolId: 'school-1',
        classTeacher: null,
        subjectAssignments: [],
      };
      prisma.teacher.findFirst.mockResolvedValue(fakeTeacher);

      const result = await service.findOne('teacher-1', currentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fakeTeacher);
    });
  });
});
