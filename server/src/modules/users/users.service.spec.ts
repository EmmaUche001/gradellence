import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/** Minimal AuthenticatedUser fixture — SCHOOL_ADMIN belonging to school-1 */
const currentUser = {
  id: 'user-1',
  schoolId: 'school-1',
  email: 'admin@school1.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['SCHOOL_ADMIN'],
  permissions: [],
} as any;

/** Factory that produces a plain-object mock for PrismaService */
function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof createPrismaMock>;
  let auditLogsService: { logAction: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    auditLogsService = { logAction: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: auditLogsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────────────────────
  // findAll() — Requirement 2.24
  // ────────────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('includes schoolId: currentUser.schoolId in the where clause when caller is SCHOOL_ADMIN', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: currentUser.schoolId }),
        }),
      );
    });

    it('also filters deletedAt: null in the where clause', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll(currentUser, 1, 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  // findOne() — Requirement 2.25
  // ────────────────────────────────────────────────────────────────
  describe('findOne()', () => {
    it('throws ForbiddenException when a SCHOOL_ADMIN requests a user from a different school', async () => {
      // User exists but belongs to a different school
      prisma.user.findFirst.mockResolvedValue({
        id: 'other-user',
        schoolId: 'school-2', // different school
        roles: [],
      });

      await expect(service.findOne('other-user', currentUser)).rejects.toThrow(ForbiddenException);
    });

    it('returns user data when the user belongs to the same school', async () => {
      const fakeUser = {
        id: 'user-2',
        schoolId: 'school-1',
        email: 'teacher@school1.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: null,
        avatar: null,
        isActive: true,
        emailVerified: false,
        roles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.user.findFirst.mockResolvedValue(fakeUser);

      const result = await service.findOne('user-2', currentUser);

      expect(result.success).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // create() — Requirement 2.26
  // ────────────────────────────────────────────────────────────────
  describe('create()', () => {
    it('throws ForbiddenException when a SCHOOL_ADMIN provides a schoolId differing from their own', async () => {
      const dto = {
        schoolId: 'school-2', // different from currentUser.schoolId (school-1)
        email: 'new@school2.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      await expect(service.create(dto as any, currentUser)).rejects.toThrow(ForbiddenException);

      // Prisma should never be reached
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('does NOT throw ForbiddenException when schoolId matches currentUser.schoolId', async () => {
      const dto = {
        schoolId: 'school-1', // matches currentUser.schoolId
        email: 'new@school1.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
      };

      // No existing user — email is available
      prisma.user.findUnique.mockResolvedValue(null);

      const createdUser = {
        id: 'new-user-id',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        schoolId: dto.schoolId,
        roles: [],
      };
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create(dto as any, currentUser);

      expect(result.success).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // update() — Requirement 2.27
  // ────────────────────────────────────────────────────────────────
  describe('update()', () => {
    it('calls auditLogsService.logAction with "ROLE_CHANGED" when the role assignment changes', async () => {
      const targetUserId = 'user-2';

      // Existing user in same school
      prisma.user.findFirst.mockResolvedValue({
        id: targetUserId,
        schoolId: 'school-1',
        email: 'user@school1.com',
      });

      // No conflicting email
      prisma.user.findUnique.mockResolvedValue(null);

      // Updated user returned by prisma
      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        email: 'user@school1.com',
        firstName: 'User',
        lastName: 'One',
        schoolId: 'school-1',
        isActive: true,
        roles: [{ role: { name: 'TEACHER' } }],
      });

      // Old roles: role-old
      prisma.userRole.findMany.mockResolvedValue([{ roleId: 'role-old' }]);
      prisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userRole.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        roleIds: ['role-new'], // different from old roles → change detected
      };

      await service.update(targetUserId, dto as any, currentUser);

      expect(auditLogsService.logAction).toHaveBeenCalledWith(
        currentUser.id,
        'ROLE_CHANGED',
        'User',
        targetUserId,
        expect.any(Array), // old role ids
        expect.any(Array), // new role ids
        undefined,
        undefined,
      );
    });

    it('does NOT call auditLogsService.logAction when roles do not change', async () => {
      const targetUserId = 'user-2';

      prisma.user.findFirst.mockResolvedValue({
        id: targetUserId,
        schoolId: 'school-1',
        email: 'user@school1.com',
      });

      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        email: 'user@school1.com',
        firstName: 'User',
        lastName: 'One',
        schoolId: 'school-1',
        isActive: true,
        roles: [{ role: { name: 'TEACHER' } }],
      });

      // Old role and new role are the same: role-same
      prisma.userRole.findMany.mockResolvedValue([{ roleId: 'role-same' }]);
      prisma.userRole.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userRole.createMany.mockResolvedValue({ count: 1 });

      const dto = {
        roleIds: ['role-same'], // same as existing role → no change
      };

      await service.update(targetUserId, dto as any, currentUser);

      expect(auditLogsService.logAction).not.toHaveBeenCalled();
    });

    it('does NOT call auditLogsService.logAction when no roleIds are provided', async () => {
      const targetUserId = 'user-2';

      prisma.user.findFirst.mockResolvedValue({
        id: targetUserId,
        schoolId: 'school-1',
        email: 'user@school1.com',
      });

      prisma.user.update.mockResolvedValue({
        id: targetUserId,
        email: 'updated@school1.com',
        firstName: 'Updated',
        lastName: 'User',
        schoolId: 'school-1',
        isActive: true,
        roles: [],
      });

      // dto with no roleIds — just a name change
      const dto = { firstName: 'Updated' };

      await service.update(targetUserId, dto as any, currentUser);

      expect(auditLogsService.logAction).not.toHaveBeenCalled();
    });
  });
});
