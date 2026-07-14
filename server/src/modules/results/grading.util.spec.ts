import { resolveGrade, assignPositions, GradeScaleEntry } from './grading.util';

describe('resolveGrade', () => {
  const gradeScales: GradeScaleEntry[] = [
    { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
    { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good' },
    { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good' },
    { grade: 'F', minScore: 0, maxScore: 49, remark: 'Fail' },
  ];

  it('resolves a score to the matching grade and remark', () => {
    expect(resolveGrade(85, gradeScales)).toEqual({ grade: 'A', remark: 'Excellent' });
    expect(resolveGrade(65, gradeScales)).toEqual({ grade: 'B', remark: 'Very Good' });
    expect(resolveGrade(30, gradeScales)).toEqual({ grade: 'F', remark: 'Fail' });
  });

  it('respects a school\'s custom (non-default) grading scale', () => {
    // A school that, say, only has three wide bands — proves this isn't
    // hardcoded the way the old pdf.service.ts getGrade() was.
    const customScale: GradeScaleEntry[] = [
      { grade: 'PASS', minScore: 40, maxScore: 100, remark: 'Met expectations' },
      { grade: 'FAIL', minScore: 0, maxScore: 39, remark: 'Below expectations' },
    ];
    expect(resolveGrade(45, customScale)).toEqual({ grade: 'PASS', remark: 'Met expectations' });
    expect(resolveGrade(39, customScale)).toEqual({ grade: 'FAIL', remark: 'Below expectations' });
  });

  it('returns nulls when no band matches the score', () => {
    expect(resolveGrade(150, gradeScales)).toEqual({ grade: null, remark: null });
  });
});

describe('assignPositions', () => {
  it('ranks entries by totalScore descending, 1-based', () => {
    const entries = [
      { id: 'a', totalScore: 70 },
      { id: 'b', totalScore: 95 },
      { id: 'c', totalScore: 82 },
    ];

    const ranked = assignPositions(entries);

    expect(ranked.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((e) => e.position)).toEqual([1, 2, 3]);
  });

  it('does not mutate the input array', () => {
    const entries = [
      { id: 'a', totalScore: 50 },
      { id: 'b', totalScore: 90 },
    ];
    const original = [...entries];

    assignPositions(entries);

    expect(entries).toEqual(original);
  });

  it('gives consecutive (not shared) positions on a tie', () => {
    const entries = [
      { id: 'a', totalScore: 80 },
      { id: 'b', totalScore: 80 },
    ];

    const ranked = assignPositions(entries);

    expect(ranked.map((e) => e.position)).toEqual([1, 2]);
  });
});
