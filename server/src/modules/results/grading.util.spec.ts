import {
  resolveGrade,
  assignPositions,
  GradeScaleEntry,
  calculateGPA,
  calculateCumulativeGPA,
  RankingStrategy,
} from './grading.util';

describe('resolveGrade', () => {
  const gradeScales: GradeScaleEntry[] = [
    { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent', points: 4.0, isPass: true },
    { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good', points: 3.0, isPass: true },
    { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good', points: 2.0, isPass: true },
    { grade: 'F', minScore: 0, maxScore: 49, remark: 'Fail', points: 0.0, isPass: false },
  ];

  it('resolves a score to the matching grade, remark, points, and isPass', () => {
    expect(resolveGrade(85, gradeScales)).toEqual({
      grade: 'A',
      remark: 'Excellent',
      points: 4.0,
      isPass: true,
    });
    expect(resolveGrade(65, gradeScales)).toEqual({
      grade: 'B',
      remark: 'Very Good',
      points: 3.0,
      isPass: true,
    });
    expect(resolveGrade(30, gradeScales)).toEqual({
      grade: 'F',
      remark: 'Fail',
      points: 0.0,
      isPass: false,
    });
  });

  it("respects a school's custom (non-default) grading scale", () => {
    // A school that, say, only has three wide bands — proves this isn't
    // hardcoded the way the old pdf.service.ts getGrade() was.
    const customScale: GradeScaleEntry[] = [
      {
        grade: 'PASS',
        minScore: 40,
        maxScore: 100,
        remark: 'Met expectations',
        points: 3.0,
        isPass: true,
      },
      {
        grade: 'FAIL',
        minScore: 0,
        maxScore: 39,
        remark: 'Below expectations',
        points: 0.0,
        isPass: false,
      },
    ];
    expect(resolveGrade(45, customScale)).toEqual({
      grade: 'PASS',
      remark: 'Met expectations',
      points: 3.0,
      isPass: true,
    });
    expect(resolveGrade(39, customScale)).toEqual({
      grade: 'FAIL',
      remark: 'Below expectations',
      points: 0.0,
      isPass: false,
    });
  });

  it('returns nulls when no band matches the score', () => {
    expect(resolveGrade(150, gradeScales)).toEqual({
      grade: null,
      remark: null,
      points: null,
      isPass: false,
    });
  });
});

describe('calculateGPA', () => {
  it('calculates average GPA from results with points', () => {
    const results = [{ points: 4.0 }, { points: 3.0 }, { points: 2.0 }, { points: null }];
    expect(calculateGPA(results)).toEqual(3.0);
  });

  it('returns 0 if no valid points', () => {
    const results = [{ points: null }, { points: null }];
    expect(calculateGPA(results)).toEqual(0);
  });
});

describe('calculateCumulativeGPA', () => {
  it('calculates cumulative GPA across multiple terms', () => {
    const terms = [
      { results: [{ points: 4.0 }, { points: 3.0 }] },
      { results: [{ points: 3.0 }, { points: 4.0 }] },
    ];
    expect(calculateCumulativeGPA(terms)).toEqual(3.5);
  });
});

describe('assignPositions', () => {
  it('ranks entries by totalScore descending, 1-based (standard strategy)', () => {
    const entries = [
      { id: 'a', totalScore: 70 },
      { id: 'b', totalScore: 95 },
      { id: 'c', totalScore: 82 },
    ];

    const ranked = assignPositions(entries, RankingStrategy.STANDARD);

    expect(ranked.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(ranked.map((e) => e.position)).toEqual([1, 2, 3]);
  });

  it('uses competition ranking (same position for ties, skips next)', () => {
    const entries = [
      { id: 'a', totalScore: 80 },
      { id: 'b', totalScore: 80 },
      { id: 'c', totalScore: 70 },
    ];

    const ranked = assignPositions(entries, RankingStrategy.COMPETITION);

    expect(ranked.map((e) => e.position)).toEqual([1, 1, 3]);
  });

  it('uses dense ranking (same position for ties, no skip)', () => {
    const entries = [
      { id: 'a', totalScore: 80 },
      { id: 'b', totalScore: 80 },
      { id: 'c', totalScore: 70 },
    ];

    const ranked = assignPositions(entries, RankingStrategy.DENSE);

    expect(ranked.map((e) => e.position)).toEqual([1, 1, 2]);
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

  it('gives consecutive (not shared) positions on a tie by default', () => {
    const entries = [
      { id: 'a', totalScore: 80 },
      { id: 'b', totalScore: 80 },
    ];

    const ranked = assignPositions(entries);

    expect(ranked.map((e) => e.position)).toEqual([1, 2]);
  });
});
