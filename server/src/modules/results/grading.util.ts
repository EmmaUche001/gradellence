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
}

export interface ResolvedGrade {
  grade: string | null;
  remark: string | null;
}

/**
 * Resolve a numeric score to a grade/remark using the school's own
 * GradeScale rows. Callers must pass gradeScales already filtered to the
 * correct school (and typically isActive: true) — this function does not
 * touch the database, it's a pure mapping so it's trivially testable and
 * safely shareable between modules without creating a circular dependency
 * between ResultsService and PdfService.
 *
 * Returns { grade: null, remark: null } if no band matches the score —
 * callers should decide how to display that (e.g. "Not graded").
 */
export function resolveGrade(score: number, gradeScales: GradeScaleEntry[]): ResolvedGrade {
  for (const gs of gradeScales) {
    if (score >= gs.minScore && score <= gs.maxScore) {
      return { grade: gs.grade, remark: gs.remark };
    }
  }
  return { grade: null, remark: null };
}

/**
 * Rank a set of entries by totalScore, descending, assigning a 1-based
 * position to each. This preserves the exact ranking behaviour that
 * existed inline in results.service.getBroadsheet() (sequential position,
 * no shared rank for ties) — it has just been extracted so pdf.service.ts
 * can produce an identical position column instead of having none at all.
 *
 * Tie-handling note: two students with the same totalScore currently get
 * consecutive positions (e.g. 3 and 4), not a shared rank. That matches
 * existing behaviour and isn't changed here — sharing ranks on ties would
 * be a deliberate product decision, not a bug fix, so it's left as-is.
 */
export function assignPositions<T extends { totalScore: number }>(
  entries: T[],
): (T & { position: number })[] {
  return [...entries]
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}
