import { NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';

/**
 * Regression suite for the cross-tenant invoice bug found during the
 * GRADELLENCE gap analysis: getInvoice/payInvoice/failInvoice previously
 * looked up invoices by raw id with no schoolId check at all, meaning a
 * SCHOOL_ADMIN from one school could read, pay, or fail another school's
 * invoice. These tests assert the fix and must keep passing.
 */
describe('BillingService — tenant isolation', () => {
  let service: BillingService;
  let prisma: { invoice: Record<string, jest.Mock> };

  const SCHOOL_A = 'school-a-id';
  const SCHOOL_B = 'school-b-id';
  const INVOICE_BELONGING_TO_SCHOOL_B = {
    id: 'invoice-1',
    schoolId: SCHOOL_B,
    status: 'PENDING',
  };

  beforeEach(() => {
    prisma = {
      invoice: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    const paymentGateway = {
      initializeTransaction: jest.fn().mockResolvedValue({ authorizationUrl: 'https://paystack.com/pay/test', reference: 'test-ref' }),
      verifyTransaction: jest.fn().mockResolvedValue({ status: 'success', amount: 5000, paidAt: new Date(), paymentMethod: 'card' }),
    };
    service = new BillingService(prisma as any, paymentGateway as any, { get: jest.fn() } as any);
  });

  describe('getInvoice', () => {
    it("returns the invoice when it belongs to the caller's school", async () => {
      const ownInvoice = { ...INVOICE_BELONGING_TO_SCHOOL_B, schoolId: SCHOOL_A };
      prisma.invoice.findFirst.mockResolvedValue(ownInvoice);

      const result = await service.getInvoice('invoice-1', SCHOOL_A);

      expect(result).toEqual(ownInvoice);
      expect(prisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'invoice-1', schoolId: SCHOOL_A },
      });
    });

    it('throws NotFoundException when the invoice belongs to a different school', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice('invoice-1', SCHOOL_A)).rejects.toThrow(NotFoundException);
    });
  });

  describe('payInvoice', () => {
    it('refuses to pay an invoice belonging to another school', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.payInvoice('invoice-1', SCHOOL_A)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("initializes payment for an invoice that belongs to the caller's own school", async () => {
      const ownInvoice = { ...INVOICE_BELONGING_TO_SCHOOL_B, schoolId: SCHOOL_A, amount: 5000 };
      prisma.invoice.findFirst.mockResolvedValue(ownInvoice);
      prisma.invoice.update.mockResolvedValue({ ...ownInvoice, paymentRef: 'generated-ref' });

      const result = await service.payInvoice('invoice-1', SCHOOL_A);

      expect(result).toEqual(
        expect.objectContaining({
          authorizationUrl: expect.any(String),
          reference: expect.any(String),
          invoiceId: 'invoice-1',
        }),
      );
      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
        data: expect.objectContaining({ paymentRef: expect.any(String) }),
      });
    });
  });

  describe('failInvoice', () => {
    it('refuses to fail an invoice belonging to another school', async () => {
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.failInvoice('invoice-1', SCHOOL_A)).rejects.toThrow(NotFoundException);
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });
});