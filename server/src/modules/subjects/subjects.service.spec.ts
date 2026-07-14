import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/types/express.types';

// Mock the trial-limits helper so it doesn't affect subjects.create tests
jest.mock('../../common/helpers/trial-limits.helper', () => ({
  enforceEntityLimit: jest.fn().mockResolvedValue(undefined),
}));

const mockCurrentUser: AuthenticatedUser = {
  id: 'user-1',
  schoolId: 'school-1',
  email: 'admin@school.com',
  firstName: 'Admin',
  lastName: 'User',
  roles: ['ADMIN'],
  permissions: [],
};

const mockPrisma = {
  subject: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  class: {
    findFirst: jest.fn(),
  },
  classSubject: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  schoolSubscription: {
    findFirst: jest.fn(),
  },
};

describe('SubjectsService', () => {
  let service: SubjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SubjectsService>(SubjectsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------
  describe('findAll()', () => {
    it('should filter subjects by schoolId from currentUser', async () => {
      mockPrisma.subject.findMany.mockResolvedValue([]);
      mockPrisma.subject.count.mockResolvedValue(0);

      await service.findAll(mockCurrentUser, 1, 10);

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockCurrentUser.schoolId,
          }),
        }),
      );
    });

    it('should include deletedAt: null in the where clause', async () => {
      mockPrisma.subject.findMany.mockResolvedValue([]);
      mockPrisma.subject.count.mockResolvedValue(0);

      await service.findAll(mockCurrentUser, 1, 10);

      expect(mockPrisma.subject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockCurrentUser.schoolId,
            deletedAt: null,
          }),
        }),
      );
    });

    it('should return paginated result with meta', async () => {
      const subjects = [{ id: 's1', name: 'Maths' }];
      mockPrisma.subject.findMany.mockResolvedValue(subjects);
      mockPrisma.subject.count.mockResolvedValue(1);

      const result = await service.findAll(mockCurrentUser, 1, 10);

      expect(result.data).toEqual(subjects);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------
  describe('create()', () => {
    const dto = { name: 'Mathematics', code: 'MATH', description: 'Math subject' };

    it('should throw ConflictException when subject with same code exists in the school', async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 'existing-id', code: 'MATH' });

      await expect(service.create(dto, mockCurrentUser)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException with descriptive message when code is duplicate', async () => {
      mockPrisma.subject.findFirst.mockResolvedValue({ id: 'existing-id', code: 'MATH' });

      await expect(service.create(dto, mockCurrentUser)).rejects.toThrow(
        'Subject with this code already exists',
      );
    });

    it('should create subject when no duplicate code exists', async () => {
      const createdSubject = { id: 'new-id', name: 'Mathematics', code: 'MATH' };
      mockPrisma.subject.findFirst.mockResolvedValue(null);
      mockPrisma.subject.create.mockResolvedValue(createdSubject);

      const result = await service.create(dto, mockCurrentUser);

      expect(mockPrisma.subject.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdSubject);
    });

    it('should check for duplicate code scoped to the currentUser schoolId', async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);
      mockPrisma.subject.create.mockResolvedValue({ id: 'new-id', code: 'MATH' });

      await service.create(dto, mockCurrentUser);

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: mockCurrentUser.schoolId,
            code: dto.code,
          }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // findOne
  // -------------------------------------------------------------------------
  describe('findOne()', () => {
    it('should throw NotFoundException when subject does not belong to the current school', async () => {
      // Simulate Prisma returning null because schoolId doesn't match
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.findOne('subject-from-other-school', mockCurrentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      mockPrisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id', mockCurrentUser)).rejects.toThrow(
        'Subject not found',
      );
    });

    it('should return subject when it belongs to the current school', async () => {
      const subject = { id: 'subject-1', schoolId: 'school-1', name: 'Maths' };
      mockPrisma.subject.findFirst.mockResolvedValue(subject);

      const result = await service.findOne('subject-1', mockCurrentUser);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(subject);
    });

    it('should query with schoolId from currentUser to prevent cross-school access', async () => {
      const subject = { id: 'subject-1', schoolId: 'school-1' };
      mockPrisma.subject.findFirst.mockResolvedValue(subject);

      await service.findOne('subject-1', mockCurrentUser);

      expect(mockPrisma.subject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'subject-1',
            schoolId: mockCurrentUser.schoolId,
          }),
        }),
      );
    });
  });
});
