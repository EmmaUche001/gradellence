/**
 * Shared grading utilities.
 *
 * Why this file exists: prior to this fix, results.service.ts resolved a
 * score to a grade/remark using the school's real, configurable GradeScale
 * rows — but pdf.service.ts independently re-derived grades using a
 * hardcoded fixed scale (70/60/50/45/40), and ranking/position was computed
 * once inline inside results.service.getBroadsheet() with no equivalent in
 * the PDF broadsheet. That meant a school with a custom grading scale could
 * see one grade on screen and a different one on a printed report card for
 * the same student/subject, and the PDF broadsheet never showed a position
 * column at all even though the on-screen one did.
 *
 * Both call sites now import these two functions instead of maintaining
 * their own copies, so there is exactly one place that defines "what grade
 * does this score map to" and "how do we rank a class."
 */

export interface GradeScaleEntry {
  grade: string;
  minScore: number;
  maxScore: number;
  remark: string;
  points: number;
  isPass: boolean;
}

export interface ResolvedGrade {
  grade: string | null;
  remark: string | null;
  points: number | null;
  isPass: boolean;
}

export enum RankingStrategy {
  STANDARD = 'standard', // 1,2,3,4 for ties
  COMPETITION = 'competition', // 1,1,3 for two tied students
  DENSE = 'dense', // 1,1,2 for two tied students
}

/**
 * Resolve a numeric score to a grade/remark using the school's own
 * GradeScale rows. Callers must pass gradeScales already filtered to the
 * correct school (and typically isActive: true) — this function does not
 * touch the database, it's a pure mapping so it's trivially testable and
 * safely shareable between modules without creating a circular dependency
 * between ResultsService and PdfService.
 *
 * Returns { grade: null, remark: null, points: null, isPass: false } if no band matches the score —
 * callers should decide how to display that (e.g. "Not graded").
 */
export function resolveGrade(score: number, gradeScales: GradeScaleEntry[]): ResolvedGrade {
  for (const gs of gradeScales) {
    if (score >= gs.minScore && score <= gs.maxScore) {
      return { grade: gs.grade, remark: gs.remark, points: gs.points, isPass: gs.isPass };
    }
  }
  return { grade: null, remark: null, points: null, isPass: false };
}

/**
 * Calculate GPA from a list of results with points
 */
export function calculateGPA(results: { points: number | null }[]): number {
  const validResults = results.filter((r) => r.points !== null);
  if (validResults.length === 0) return 0;
  const totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);
  return totalPoints / validResults.length;
}

/**
 * Calculate cumulative GPA from results across multiple terms
 */
export function calculateCumulativeGPA(
  resultsByTerm: { results: { points: number | null }[] }[],
): number {
  const allResults = resultsByTerm.flatMap((term) => term.results);
  return calculateGPA(allResults);
}

/**
 * Rank a set of entries by totalScore, descending, with configurable ranking strategy
 */
export function assignPositions<T extends { totalScore: number }>(
  entries: T[],
  strategy: RankingStrategy = RankingStrategy.STANDARD,
): (T & { position: number })[] {
  const sorted = [...entries].sort((a, b) => b.totalScore - a.totalScore);

  if (strategy === RankingStrategy.STANDARD) {
    return sorted.map((entry, index) => ({ ...entry, position: index + 1 }));
  }

  if (strategy === RankingStrategy.COMPETITION) {
    let position = 1;
    const result: (T & { position: number })[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalScore < sorted[i - 1].totalScore) {
        position = i + 1;
      }
      result.push({ ...sorted[i], position });
    }
    return result;
  }

  if (strategy === RankingStrategy.DENSE) {
    let position = 1;
    const result: (T & { position: number })[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalScore < sorted[i - 1].totalScore) {
        position += 1;
      }
      result.push({ ...sorted[i], position });
    }
    return result;
  }

  return sorted.map((entry, index) => ({ ...entry, position: index + 1 }));
}
