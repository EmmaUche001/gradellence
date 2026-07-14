import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedUser } from '../../common/types/express.types';

/**
 * Regression suite for two issues found in the GRADELLENCE gap analysis:
 *  1. GET /schools/:id had no role/ownership restriction at all — any
 *     authenticated user could read any school's profile.
 *  2. PATCH /schools/:id let a SCHOOL_ADMIN flip isActive on their own
 *     school, even though suspend/reactivate is an explicit Super Admin
 *     capability per spec.
 * Both are fixed at the service layer; these tests assert the fix.
 */
describe('SchoolsService — tenant isolation', () => {
  let service: SchoolsService;
  let prisma: { school: Record<string, jest.Mock> };

  const SCHOOL_A = 'school-a-id';
  const SCHOOL_B = 'school-b-id';

  const schoolAdminOfA: AuthenticatedUser = {
    id: 'user-a',
    schoolId: SCHOOL_A,
    email: 'admin@a.test',
    firstName: 'A',
    lastName: 'Admin',
    roles: [ROLES.SCHOOL_ADMIN],
    permissions: [],
  };

  const superAdmin: AuthenticatedUser = {
    ...schoolAdminOfA,
    id: 'user-super',
    roles: [ROLES.SUPER_ADMIN],
  };

  beforeEach(() => {
    prisma = {
      school: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new SchoolsService(prisma as any);
  });

  describe('findOne', () => {
    it('lets a SCHOOL_ADMIN read their own school', async () => {
      const ownSchool = { id: SCHOOL_A, name: 'School A' };
      prisma.school.findFirst.mockResolvedValue(ownSchool);

      const result = await service.findOne(SCHOOL_A, schoolAdminOfA);

      expect(result.data).toEqual(ownSchool);
    });

    it('blocks a SCHOOL_ADMIN from reading a different school', async () => {
      await expect(service.findOne(SCHOOL_B, schoolAdminOfA)).rejects.toThrow(NotFoundException);
      // Should short-circuit before ever touching the database.
      expect(prisma.school.findFirst).not.toHaveBeenCalled();
    });

    it('lets a SUPER_ADMIN read any school', async () => {
      const otherSchool = { id: SCHOOL_B, name: 'School B' };
      prisma.school.findFirst.mockResolvedValue(otherSchool);

      const result = await service.findOne(SCHOOL_B, superAdmin);

      expect(result.data).toEqual(otherSchool);
    });
  });

  describe('update', () => {
    it('blocks a SCHOOL_ADMIN from updating a different school', async () => {
      await expect(service.update(SCHOOL_B, { name: 'Hacked' }, schoolAdminOfA)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('blocks a SCHOOL_ADMIN from toggling isActive on their own school', async () => {
      await expect(service.update(SCHOOL_A, { isActive: false }, schoolAdminOfA)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.school.update).not.toHaveBeenCalled();
    });

    it('allows a SCHOOL_ADMIN to update non-isActive fields on their own school', async () => {
      const ownSchool = { id: SCHOOL_A, name: 'Old Name', slug: 'school-a' };
      prisma.school.findFirst.mockResolvedValue(ownSchool);
      prisma.school.update.mockResolvedValue({ ...ownSchool, name: 'New Name' });

      const result = await service.update(SCHOOL_A, { name: 'New Name' }, schoolAdminOfA);

      expect(result.data.name).toBe('New Name');
    });

    it('allows a SUPER_ADMIN to suspend any school', async () => {
      const otherSchool = { id: SCHOOL_B, name: 'School B', slug: 'school-b' };
      prisma.school.findFirst.mockResolvedValue(otherSchool);
      prisma.school.update.mockResolvedValue({ ...otherSchool, isActive: false });

      const result = await service.update(SCHOOL_B, { isActive: false }, superAdmin);

      expect(result.data.isActive).toBe(false);
    });
  });
});
