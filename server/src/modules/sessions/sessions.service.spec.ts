import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { AuthenticatedUser } from '../../common/types/express.types';

describe('SessionsService', () => {
  let service: SessionsService;
  let prisma: {
    session: Record<string, jest.Mock>;
  };

  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    schoolId: 'school-a',
    email: 'admin@school-a.test',
    firstName: 'Admin',
    lastName: 'User',
    roles: ['SCHOOL_ADMIN'],
    permissions: [],
  };

  beforeEach(() => {
    prisma = {
      session: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    service = new SessionsService(prisma as any);
  });

  // ==================== findAllSessions ====================
  // Validates: Requirements 2.18

  describe('findAllSessions()', () => {
    it('filters sessions by schoolId equal to currentUser.schoolId', async () => {
      await service.findAllSessions(currentUser, 1, 10);

      const calledWith = prisma.session.findMany.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        schoolId: currentUser.schoolId,
      });
    });

    it('also filters out soft-deleted sessions', async () => {
      await service.findAllSessions(currentUser, 1, 10);

      const calledWith = prisma.session.findMany.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({ deletedAt: null });
    });

    it('applies the same schoolId filter on the count query', async () => {
      await service.findAllSessions(currentUser, 1, 10);

      const calledWith = prisma.session.count.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        schoolId: currentUser.schoolId,
      });
    });

    it('returns a paginated response structure', async () => {
      prisma.session.findMany.mockResolvedValue([{ id: 'sess-1' }]);
      prisma.session.count.mockResolvedValue(1);

      const result = await service.findAllSessions(currentUser, 1, 10);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ page: 1, limit: 10, total: 1 });
    });
  });

  // ==================== findOneSession ====================
  // Validates: Requirements 2.19

  describe('findOneSession()', () => {
    it('throws NotFoundException when session belongs to a different school', async () => {
      // findFirst returns null because the where clause includes schoolId — a
      // different-school session will not match, so the service gets null.
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneSession('other-school-session-id', currentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('queries with the correct schoolId and id combination', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneSession('sess-99', currentUser),
      ).rejects.toThrow(NotFoundException);

      const calledWith = prisma.session.findFirst.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({
        id: 'sess-99',
        schoolId: currentUser.schoolId,
        deletedAt: null,
      });
    });

    it('returns the session when it belongs to the current school', async () => {
      const sessionData = {
        id: 'sess-1',
        schoolId: currentUser.schoolId,
        name: '2024/2025',
        terms: [],
      };
      prisma.session.findFirst.mockResolvedValue(sessionData);

      const result = await service.findOneSession('sess-1', currentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(sessionData);
    });
  });

  // ==================== createSession ====================
  // Validates: Requirements 2.20

  describe('createSession()', () => {
    it('throws BadRequestException when startDate equals endDate', async () => {
      const dto = {
        name: '2024/2025',
        startDate: '2024-09-01',
        endDate: '2024-09-01', // same as startDate
      };

      await expect(service.createSession(dto, currentUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when startDate is after endDate', async () => {
      const dto = {
        name: '2024/2025',
        startDate: '2025-07-31',
        endDate: '2024-09-01', // endDate before startDate
      };

      await expect(service.createSession(dto, currentUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates the session when startDate is strictly before endDate', async () => {
      const createdSession = {
        id: 'sess-new',
        schoolId: currentUser.schoolId,
        name: '2024/2025',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-07-31'),
        isCurrent: false,
      };
      prisma.session.create.mockResolvedValue(createdSession);

      const dto = {
        name: '2024/2025',
        startDate: '2024-09-01',
        endDate: '2025-07-31',
      };

      const result = await service.createSession(dto, currentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdSession);
      expect(prisma.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            schoolId: currentUser.schoolId,
            name: dto.name,
          }),
        }),
      );
    });

    it('does not call prisma.session.create when validation fails', async () => {
      const dto = {
        name: '2024/2025',
        startDate: '2024-09-01',
        endDate: '2024-09-01',
      };

      await expect(service.createSession(dto, currentUser)).rejects.toThrow(
        BadRequestException,
      );

      expect(prisma.session.create).not.toHaveBeenCalled();
    });
  });
});
