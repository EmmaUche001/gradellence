import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { AuthenticatedUser } from '../../common/types/express.types';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;
  let prisma: {
    enrollment: Record<string, jest.Mock>;
    student: Record<string, jest.Mock>;
    class: Record<string, jest.Mock>;
    term: Record<string, jest.Mock>;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    schoolId: 'school-a',
    email: 'admin@school-a.test',
    firstName: 'Admin',
    lastName: 'A',
    roles: ['SCHOOL_ADMIN'],
    permissions: [],
  };

  /** A minimal student record that belongs to School A */
  const studentA = {
    id: 'student-a',
    schoolId: 'school-a',
    deletedAt: null,
  };

  /** A minimal class record that belongs to School A, no capacity limit */
  const classA = {
    id: 'class-a',
    schoolId: 'school-a',
    capacity: null,
    deletedAt: null,
  };

  /** A minimal term record belonging to School A */
  const termA = {
    id: 'term-a',
    schoolId: 'school-a',
    deletedAt: null,
  };

  const createDto = {
    studentId: 'student-a',
    classId: 'class-a',
    termId: 'term-a',
  };

  beforeEach(() => {
    prisma = {
      enrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          studentId: 'student-a',
          classId: 'class-a',
          termId: 'term-a',
          student: { id: 'student-a', firstName: 'Jane', lastName: 'Doe', admissionNumber: 'A1' },
          class: { id: 'class-a', name: 'JSS1', level: '1' },
          term: { id: 'term-a', name: 'Term 1' },
        }),
      },
      student: {
        findFirst: jest.fn().mockResolvedValue(studentA),
      },
      class: {
        findFirst: jest.fn().mockResolvedValue(classA),
      },
      term: {
        findFirst: jest.fn().mockResolvedValue(termA),
      },
    };

    service = new EnrollmentsService(prisma as any);
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll()', () => {
    it("scopes the query to the caller's school via student.schoolId", async () => {
      await service.findAll(currentUser, 1, 10);

      const findManyArgs = prisma.enrollment.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toMatchObject({
        student: { schoolId: currentUser.schoolId },
      });
    });

    it('passes the same schoolId filter to the count query', async () => {
      await service.findAll(currentUser, 1, 10);

      const countArgs = prisma.enrollment.count.mock.calls[0][0];
      expect(countArgs.where).toMatchObject({
        student: { schoolId: currentUser.schoolId },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne()', () => {
    it('throws NotFoundException when the enrollment belongs to a different school', async () => {
      // findFirst returns null because the where clause scopes by
      // student.schoolId — a cross-tenant id won't match.
      prisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(service.findOne('enrollment-from-school-b', currentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the enrollment when it belongs to the same school', async () => {
      const ownEnrollment = {
        id: 'enrollment-1',
        student: {
          id: 'student-a',
          schoolId: 'school-a',
          firstName: 'Jane',
          lastName: 'Doe',
          admissionNumber: 'A1',
        },
        class: { id: 'class-a', name: 'JSS1', level: '1' },
        term: { id: 'term-a', name: 'Term 1', session: { id: 'sess-1', name: '2024/2025' } },
      };
      prisma.enrollment.findFirst.mockResolvedValue(ownEnrollment);

      const result = await service.findOne('enrollment-1', currentUser);

      expect(result.data).toEqual(ownEnrollment);
    });
  });

  // ---------------------------------------------------------------------------
  // create — NotFoundException when referenced student belongs to a different school
  // ---------------------------------------------------------------------------
  describe('create() — student not in school', () => {
    it('throws NotFoundException when the student belongs to a different school', async () => {
      // student.findFirst returns null because schoolId filter won't match
      prisma.student.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, currentUser)).rejects.toThrow(NotFoundException);

      // Ensure no enrollment is created
      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // create — ConflictException when student already enrolled in the same term
  // ---------------------------------------------------------------------------
  describe('create() — duplicate enrollment', () => {
    it('throws ConflictException when the student is already enrolled in the same term', async () => {
      // All prerequisite lookups succeed
      prisma.student.findFirst.mockResolvedValue(studentA);
      prisma.class.findFirst.mockResolvedValue(classA);
      prisma.term.findFirst.mockResolvedValue(termA);

      // Simulate an existing enrollment record for the same (student, term) pair
      prisma.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment-existing',
        studentId: 'student-a',
        termId: 'term-a',
      });

      await expect(service.create(createDto, currentUser)).rejects.toThrow(ConflictException);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // create — BadRequestException when class capacity is non-null and reached
  // ---------------------------------------------------------------------------
  describe('create() — class at capacity', () => {
    it('throws BadRequestException when the class capacity is non-null and has been reached', async () => {
      // Class has a capacity of 30 and is currently full
      const fullClass = { ...classA, capacity: 30 };

      prisma.student.findFirst.mockResolvedValue(studentA);
      prisma.class.findFirst.mockResolvedValue(fullClass);
      prisma.term.findFirst.mockResolvedValue(termA);

      // No existing enrollment for this student in this term
      prisma.enrollment.findUnique.mockResolvedValue(null);

      // Current enrollment count equals capacity
      prisma.enrollment.count.mockResolvedValue(30);

      await expect(service.create(createDto, currentUser)).rejects.toThrow(BadRequestException);

      expect(prisma.enrollment.create).not.toHaveBeenCalled();
    });

    it('does NOT throw when capacity is null (unlimited class)', async () => {
      // classA already has capacity: null in the default mock
      prisma.student.findFirst.mockResolvedValue(studentA);
      prisma.class.findFirst.mockResolvedValue(classA); // capacity: null
      prisma.term.findFirst.mockResolvedValue(termA);
      prisma.enrollment.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto, currentUser)).resolves.toBeDefined();
    });
  });
});
