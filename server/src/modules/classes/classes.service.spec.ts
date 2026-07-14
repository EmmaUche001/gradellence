import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { AuthenticatedUser } from '../../common/types/express.types';

// Mock the trial-limits helper so create() doesn't need prisma.schoolSubscription
jest.mock('../../common/helpers/trial-limits.helper', () => ({
  enforceEntityLimit: jest.fn().mockResolvedValue(undefined),
}));

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: {
    class: Record<string, jest.Mock>;
    enrollment: Record<string, jest.Mock>;
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

  /** A minimal class record belonging to School A */
  const classA = {
    id: 'class-a',
    schoolId: 'school-a',
    name: 'JSS 1',
    level: 7,
    deletedAt: null,
  };

  beforeEach(() => {
    prisma = {
      class: {
        findMany: jest.fn().mockResolvedValue([classA]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(classA),
        create: jest.fn().mockResolvedValue(classA),
        update: jest.fn().mockResolvedValue({ ...classA, deletedAt: new Date() }),
      },
      enrollment: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    service = new ClassesService(prisma as any);
  });

  // ---------------------------------------------------------------------------
  // findAll — Requirement 2.15
  // ---------------------------------------------------------------------------
  describe('findAll()', () => {
    it("scopes the query to the caller's school via schoolId", async () => {
      await service.findAll(currentUser, 1, 10);

      const findManyArgs = prisma.class.findMany.mock.calls[0][0];
      expect(findManyArgs.where).toMatchObject({
        schoolId: currentUser.schoolId,
      });
    });

    it('passes the same schoolId filter to the count query', async () => {
      await service.findAll(currentUser, 1, 10);

      const countArgs = prisma.class.count.mock.calls[0][0];
      expect(countArgs.where).toMatchObject({
        schoolId: currentUser.schoolId,
      });
    });

    it('returns paginated class data', async () => {
      const result = await service.findAll(currentUser, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([classA]);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne — Requirement 2.16
  // ---------------------------------------------------------------------------
  describe('findOne()', () => {
    it('throws NotFoundException when the class belongs to a different school', async () => {
      // findFirst returns null because the where clause scopes by schoolId —
      // a cross-tenant id won't match.
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('class-from-school-b', currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the class when it belongs to the same school', async () => {
      prisma.class.findFirst.mockResolvedValue(classA);

      const result = await service.findOne('class-a', currentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(classA);
    });
  });

  // ---------------------------------------------------------------------------
  // remove — Requirement 2.17
  // ---------------------------------------------------------------------------
  describe('remove()', () => {
    it('throws BadRequestException when the class has active enrollment records', async () => {
      // Class exists in this school
      prisma.class.findFirst.mockResolvedValue(classA);
      // Simulate enrollments present
      prisma.enrollment.count.mockResolvedValue(3);

      await expect(service.remove('class-a', currentUser)).rejects.toThrow(
        BadRequestException,
      );

      // Soft-delete should NOT have been called
      expect(prisma.class.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the class belongs to a different school', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('class-from-school-b', currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('soft-deletes the class when there are no enrollments', async () => {
      prisma.class.findFirst.mockResolvedValue(classA);
      prisma.enrollment.count.mockResolvedValue(0);

      const result = await service.remove('class-a', currentUser);

      expect(result.success).toBe(true);
      expect(prisma.class.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'class-a' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });
  });
});
