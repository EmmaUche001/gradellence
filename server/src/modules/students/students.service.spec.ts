import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { PrismaService } from '../../database/prisma.service';

// Mock the trial-limits helper so create() tests don't need full prisma setup
jest.mock('../../common/helpers/trial-limits.helper', () => ({
  enforceEntityLimit: jest.fn().mockResolvedValue(undefined),
}));

/** Minimal AuthenticatedUser fixture used across tests */
const currentUser = {
  id: 'user-1',
  schoolId: 'school-1',
  email: 'admin@school1.com',
  role: 'SCHOOL_ADMIN',
} as any;

/** Factory that produces a plain-object mock for PrismaService */
function createPrismaMock() {
  const studentMock = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const enrollmentMock = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  };

  const termMock = {
    findFirst: jest.fn(),
  };

  const classMock = {
    findFirst: jest.fn(),
  };

  const schoolSubscriptionMock = {
    findFirst: jest.fn().mockResolvedValue(null),
  };

  return {
    student: studentMock,
    enrollment: enrollmentMock,
    term: termMock,
    class: classMock,
    schoolSubscription: schoolSubscriptionMock,
    $transaction: jest.fn(),
  };
}

describe('StudentsService', () => {
  let service: StudentsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // findAll() — Requirement 2.11
  // ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('includes schoolId: currentUser.schoolId in the where clause', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: currentUser.schoolId }),
        }),
      );
    });

    it('also filters deletedAt: null', async () => {
      prisma.student.findMany.mockResolvedValue([]);
      prisma.student.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.student.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('returns paged result with meta', async () => {
      const fakeStudents = [{ id: 'stu-1', schoolId: 'school-1' }];
      prisma.student.findMany.mockResolvedValue(fakeStudents);
      prisma.student.count.mockResolvedValue(1);

      const result = await service.findAll(currentUser, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fakeStudents);
      expect(result.meta.total).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // findOne() — Requirement 2.12
  // ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('throws NotFoundException when student belongs to a different school (findFirst returns null)', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-school-student-id', currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns student data when found in same school', async () => {
      const fakeStudent = { id: 'stu-1', schoolId: 'school-1', enrollments: [] };
      prisma.student.findFirst.mockResolvedValue(fakeStudent);

      const result = await service.findOne('stu-1', currentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(fakeStudent);
    });

    it('passes schoolId: currentUser.schoolId in the where clause', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.findOne('stu-1', currentUser)).rejects.toThrow(NotFoundException);

      expect(prisma.student.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: currentUser.schoolId }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // remove() — Requirement 2.13 (soft delete)
  // ────────────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('calls prisma.student.update (not delete) with a deletedAt field set', async () => {
      const fakeStudent = { id: 'stu-1', schoolId: 'school-1' };
      prisma.student.findFirst.mockResolvedValue(fakeStudent);
      prisma.student.update.mockResolvedValue({ ...fakeStudent, deletedAt: new Date() });

      await service.remove('stu-1', currentUser);

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
      // Ensure hard delete is never called
      expect(prisma.student.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when student not found or belongs to different school', async () => {
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.remove('missing-id', currentUser)).rejects.toThrow(NotFoundException);
    });

    it('sets updatedBy to currentUser.id on soft delete', async () => {
      const fakeStudent = { id: 'stu-1', schoolId: 'school-1' };
      prisma.student.findFirst.mockResolvedValue(fakeStudent);
      prisma.student.update.mockResolvedValue({});

      await service.remove('stu-1', currentUser);

      expect(prisma.student.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ updatedBy: currentUser.id }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // promoteStudents() — Requirement 2.14
  // ────────────────────────────────────────────────────────────────
  describe('promoteStudents()', () => {
    const promoteDto = {
      fromClassId: 'class-from',
      toClassId: 'class-to',
      termId: 'term-1',
      nextTermId: 'term-2',
    };

    function setupHappyPathMocks() {
      // All lookup queries return valid records for the same school
      prisma.class.findFirst
        .mockResolvedValueOnce({ id: 'class-from', schoolId: 'school-1' }) // fromClass
        .mockResolvedValueOnce({ id: 'class-to', schoolId: 'school-1' }); // toClass

      prisma.term.findFirst
        .mockResolvedValueOnce({ id: 'term-1', schoolId: 'school-1' }) // term
        .mockResolvedValueOnce({ id: 'term-2', schoolId: 'school-1' }); // nextTerm

      prisma.enrollment.findMany.mockResolvedValue([
        { studentId: 'stu-1' },
        { studentId: 'stu-2' },
      ]);

      // $transaction invokes the callback with the prisma client
      prisma.$transaction.mockImplementation(async (fn: (tx: any) => any) => fn(prisma));

      // createMany returns count
      prisma.enrollment.createMany.mockResolvedValue({ count: 2 });
    }

    it('calls prisma.$transaction when there are students to promote', async () => {
      setupHappyPathMocks();

      await service.promoteStudents(promoteDto, currentUser);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('uses the callback-based $transaction pattern', async () => {
      setupHappyPathMocks();

      await service.promoteStudents(promoteDto, currentUser);

      // The transaction receives a function (not an array of promises)
      const transactionArg = prisma.$transaction.mock.calls[0][0];
      expect(typeof transactionArg).toBe('function');
    });

    it('returns promotedCount and skippedCount from the transaction result', async () => {
      setupHappyPathMocks();

      const result = await service.promoteStudents(promoteDto, currentUser);

      expect(result).toEqual({ promotedCount: 2, skippedCount: 0 });
    });

    it('returns { promotedCount: 0, skippedCount: 0 } when no enrollments found', async () => {
      prisma.class.findFirst
        .mockResolvedValueOnce({ id: 'class-from', schoolId: 'school-1' })
        .mockResolvedValueOnce({ id: 'class-to', schoolId: 'school-1' });

      prisma.term.findFirst
        .mockResolvedValueOnce({ id: 'term-1', schoolId: 'school-1' })
        .mockResolvedValueOnce({ id: 'term-2', schoolId: 'school-1' });

      prisma.enrollment.findMany.mockResolvedValue([]);

      const result = await service.promoteStudents(promoteDto, currentUser);

      expect(result).toEqual({ promotedCount: 0, skippedCount: 0 });
      // $transaction should NOT be called when there's nothing to promote
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when source class not found in school', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(service.promoteStudents(promoteDto, currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when target class not found in school', async () => {
      prisma.class.findFirst
        .mockResolvedValueOnce({ id: 'class-from', schoolId: 'school-1' })
        .mockResolvedValueOnce(null);

      await expect(service.promoteStudents(promoteDto, currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
