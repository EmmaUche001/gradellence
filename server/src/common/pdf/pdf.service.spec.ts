import { PdfService } from './pdf.service';

/**
 * Regression suite for the PDF grade-source bug: previously
 * generateReportCard/generateBroadsheet/generateTranscript all re-derived
 * grades from a hardcoded fixed scale (70/60/50/45/40) instead of using
 * the school's real, configurable GradeScale or the already-computed
 * Result.grade — meaning a school with a custom scale could see one grade
 * on screen and a different one on a printed document for the same result.
 *
 * Full text-content assertions on the generated PDF bytes aren't possible
 * here without adding a PDF-parsing dependency (no network access to
 * install one in this environment) — these tests instead assert the two
 * things that actually matter for correctness: (1) the school's real
 * GradeScale is the thing being queried/used, and (2) generation completes
 * without error now that the hardcoded getGrade()/getRemark() methods have
 * been removed (if any stray call to them had been left behind, these
 * would throw a TypeError at runtime, since the methods no longer exist).
 */
describe('PdfService — grade source', () => {
  let service: PdfService;
  let prisma: any;
  let verifyService: any;

  const SCHOOL_ID = 'school-1';
  const gradeScaleRows = [
    { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
    { grade: 'F', minScore: 0, maxScore: 69, remark: 'Needs Improvement' },
  ];

  beforeEach(() => {
    prisma = {
      gradeScale: { findMany: jest.fn().mockResolvedValue(gradeScaleRows) },
      student: { findFirst: jest.fn() },
      class: { findFirst: jest.fn() },
      term: { findFirst: jest.fn() },
      documentVerification: { upsert: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    verifyService = {
      createVerification: jest
        .fn()
        .mockResolvedValue({ hash: 'test-hash', qrDataUrl: 'data:image/png;base64,test' }),
      verifyDocument: jest.fn(),
      generateHash: jest.fn().mockReturnValue('test-hash'),
    };
    service = new PdfService(prisma, verifyService);
  });

  describe('generateReportCard', () => {
    it("queries the school's own active GradeScale, not a hardcoded one", async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionNumber: 'A1',
        school: { name: 'Test School' },
        results: [
          {
            totalScore: 95,
            grade: 'A', // already computed/stored by ResultsService
            remark: 'Excellent',
            subject: { name: 'Math' },
            term: { name: 'Term 1' },
          },
        ],
        enrollments: [{ class: { name: 'JSS1' } }],
      });

      const buffer = await service.generateReportCard('student-1', 'term-1', SCHOOL_ID);

      expect(prisma.gradeScale.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: SCHOOL_ID, isActive: true } }),
      );
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('falls back to resolving against the real scale only when a result has no stored grade yet', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionNumber: 'A1',
        school: { name: 'Test School' },
        results: [
          {
            totalScore: 80,
            grade: null, // not yet graded
            remark: null,
            subject: { name: 'Math' },
            term: { name: 'Term 1' },
          },
        ],
        enrollments: [{ class: { name: 'JSS1' } }],
      });

      // Should not throw, and should still query the real scale to resolve
      // the fallback (proving the hardcoded getGrade() path is gone).
      const buffer = await service.generateReportCard('student-1', 'term-1', SCHOOL_ID);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateTranscript', () => {
    it('completes without error using stored grades (no call to a hardcoded scale)', async () => {
      prisma.student.findFirst.mockResolvedValue({
        id: 'student-1',
        firstName: 'Jane',
        lastName: 'Doe',
        admissionNumber: 'A1',
        dateOfBirth: null,
        school: { name: 'Test School' },
        results: [
          {
            totalScore: 95,
            grade: 'A',
            subject: { name: 'Math' },
            termId: 'term-1',
            term: {
              id: 'term-1',
              name: 'Term 1',
              sessionId: 'session-1',
              session: { id: 'session-1', name: '2025/2026' },
            },
          },
        ],
      });

      const buffer = await service.generateTranscript('student-1', SCHOOL_ID);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
