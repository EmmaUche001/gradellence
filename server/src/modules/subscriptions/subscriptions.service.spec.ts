import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../database/prisma.service';

/** Minimal AuthenticatedUser fixture — SCHOOL_ADMIN belonging to school-1 */
const currentUser = {
  id: 'user-1',
  schoolId: 'school-1',
  roles: ['SCHOOL_ADMIN'],
  permissions: [],
} as any;

/** Factory that produces a plain-object mock for PrismaService */
function createPrismaMock() {
  return {
    subscriptionPlan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    schoolSubscription: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
  };
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // subscribe() — Requirement 2.28
  // ---------------------------------------------------------------------------
  describe('subscribe()', () => {
    const schoolId = 'school-1';
    const planId = 'plan-1';

    const fakePlan = {
      id: planId,
      name: 'Basic Plan',
      priceNGN: 5000,
      duration: 30,
      isActive: true,
    };

    const fakeSubscription = {
      id: 'sub-new',
      schoolId,
      planId,
      status: 'ACTIVE',
      autoRenew: true,
      plan: fakePlan,
    };

    it('cancels existing ACTIVE subscriptions before creating a new one', async () => {
      // Arrange: plan exists and is active
      prisma.subscriptionPlan.findUnique.mockResolvedValue(fakePlan);
      // updateMany cancels existing active subs
      prisma.schoolSubscription.updateMany.mockResolvedValue({ count: 1 });
      // create returns the new subscription
      prisma.schoolSubscription.create.mockResolvedValue(fakeSubscription);
      // invoice creation succeeds
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });

      await service.subscribe(schoolId, planId);

      // Assert updateMany was called with the correct arguments to cancel ACTIVE subs
      expect(prisma.schoolSubscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId,
            status: 'ACTIVE',
          }),
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });

    it('calls updateMany to cancel ACTIVE subscriptions BEFORE calling create', async () => {
      const callOrder: string[] = [];

      prisma.subscriptionPlan.findUnique.mockResolvedValue(fakePlan);
      prisma.schoolSubscription.updateMany.mockImplementation(async () => {
        callOrder.push('updateMany');
        return { count: 1 };
      });
      prisma.schoolSubscription.create.mockImplementation(async () => {
        callOrder.push('create');
        return fakeSubscription;
      });
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });

      await service.subscribe(schoolId, planId);

      expect(callOrder.indexOf('updateMany')).toBeLessThan(
        callOrder.indexOf('create'),
      );
    });

    it('throws NotFoundException when the plan does not exist', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(null);

      await expect(service.subscribe(schoolId, planId)).rejects.toThrow(
        NotFoundException,
      );

      // Neither updateMany nor create should have been called
      expect(prisma.schoolSubscription.updateMany).not.toHaveBeenCalled();
      expect(prisma.schoolSubscription.create).not.toHaveBeenCalled();
    });

    it('returns the newly created subscription', async () => {
      prisma.subscriptionPlan.findUnique.mockResolvedValue(fakePlan);
      prisma.schoolSubscription.updateMany.mockResolvedValue({ count: 0 });
      prisma.schoolSubscription.create.mockResolvedValue(fakeSubscription);
      prisma.invoice.create.mockResolvedValue({ id: 'inv-1' });

      const result = await service.subscribe(schoolId, planId);

      expect(result).toEqual(fakeSubscription);
    });
  });

  // ---------------------------------------------------------------------------
  // getCurrentSubscription() — Requirement 2.29
  // ---------------------------------------------------------------------------
  describe('getCurrentSubscription()', () => {
    const schoolId = 'school-1';

    it('throws NotFoundException when no active subscription exists for the school', async () => {
      // Simulate Prisma returning null — no ACTIVE subscription row found
      prisma.schoolSubscription.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentSubscription(schoolId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException with the correct message when no active subscription exists', async () => {
      prisma.schoolSubscription.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentSubscription(schoolId)).rejects.toThrow(
        'No active subscription found',
      );
    });

    it('returns the active subscription when one exists', async () => {
      const activeSubscription = {
        id: 'sub-1',
        schoolId,
        status: 'ACTIVE',
        plan: { id: 'plan-1', name: 'Basic Plan' },
      };
      prisma.schoolSubscription.findFirst.mockResolvedValue(activeSubscription);

      const result = await service.getCurrentSubscription(schoolId);

      expect(result).toEqual(activeSubscription);
    });

    it('queries for ACTIVE subscriptions scoped to the given schoolId', async () => {
      prisma.schoolSubscription.findFirst.mockResolvedValue(null);

      await expect(service.getCurrentSubscription(schoolId)).rejects.toThrow(
        NotFoundException,
      );

      expect(prisma.schoolSubscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });
});
