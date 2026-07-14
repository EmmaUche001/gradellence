import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ROLES } from '../../common/constants/roles.constants';
import { AuthenticatedUser } from '../../common/types/express.types';

/**
 * Regression suite for the cross-tenant audit-log leak found during the
 * GRADELLENCE gap analysis: findAll() built its `where` clause with no
 * schoolId filter at all, so any SCHOOL_ADMIN could read every school's
 * audit history. findOne() had the same gap. These tests assert the fix.
 */
describe('AuditLogsService — tenant isolation', () => {
  let service: AuditLogsService;
  let prisma: { auditLog: Record<string, jest.Mock> };

  const schoolAdmin: AuthenticatedUser = {
    id: 'user-a',
    schoolId: 'school-a-id',
    email: 'admin@a.test',
    firstName: 'A',
    lastName: 'Admin',
    roles: [ROLES.SCHOOL_ADMIN],
    permissions: [],
  };

  const superAdmin: AuthenticatedUser = {
    ...schoolAdmin,
    id: 'user-super',
    roles: [ROLES.SUPER_ADMIN],
  };

  beforeEach(() => {
    prisma = {
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
      },
    };
    service = new AuditLogsService(prisma as any);
  });

  describe('findAll', () => {
    it("scopes the query to the caller's own school for a non-SUPER_ADMIN", async () => {
      await service.findAll(schoolAdmin, 1, 20);

      const calledWith = prisma.auditLog.findMany.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        actor: { schoolId: schoolAdmin.schoolId },
      });
    });

    it('does not scope the query for a SUPER_ADMIN', async () => {
      await service.findAll(superAdmin, 1, 20);

      const calledWith = prisma.auditLog.findMany.mock.calls[0][0];
      expect(calledWith.where.actor).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('rejects access to a log entry whose actor belongs to a different school', async () => {
      prisma.auditLog.findUnique.mockResolvedValue({
        id: 'log-1',
        actor: { id: 'other-user', schoolId: 'school-b-id' },
      });

      await expect(service.findOne('log-1', schoolAdmin)).rejects.toThrow(ForbiddenException);
    });

    it("allows access to a log entry whose actor belongs to the caller's own school", async () => {
      const log = { id: 'log-1', actor: { id: 'user-a', schoolId: schoolAdmin.schoolId } };
      prisma.auditLog.findUnique.mockResolvedValue(log);

      const result = await service.findOne('log-1', schoolAdmin);

      expect(result.data).toEqual(log);
    });

    it('throws NotFoundException when the log id does not exist at all', async () => {
      prisma.auditLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing', schoolAdmin)).rejects.toThrow(NotFoundException);
    });

    it('allows a SUPER_ADMIN to access a log entry from any school', async () => {
      const log = { id: 'log-1', actor: { id: 'other-user', schoolId: 'school-b-id' } };
      prisma.auditLog.findUnique.mockResolvedValue(log);

      const result = await service.findOne('log-1', superAdmin);

      expect(result.data).toEqual(log);
    });
  });
});
