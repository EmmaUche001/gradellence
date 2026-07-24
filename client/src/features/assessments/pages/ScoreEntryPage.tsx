import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import { useToastStore } from '../../../store/toastStore';
import { useAuthStore } from '../../../store/authStore';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { FormSection } from '../../../components/ui/FormSection';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';

// ---------- types ----------

interface SelectOption {
  value: string;
  label: string;
}

interface EnrolledStudent {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface ExistingAssessment {
  id: string;
  studentId: string;
  type: string;
  score: number;
}

type ScoreCell = {
  value: string;
  assessmentId?: string;
  isDirty: boolean;
};
type ScoreGrid = Record<string, Record<string, ScoreCell>>; // [studentId][type]

// ---------- assessment type config (fetched from school, fallback to defaults) ----------

const DEFAULT_ASSESSMENT_TYPES = [
  { type: 'CA1',  label: 'CA 1', maxScore: 20 },
  { type: 'CA2',  label: 'CA 2', maxScore: 20 },
  { type: 'EXAM', label: 'Exam', maxScore: 60 },
] as const;

type AssessmentTypeConfig = { type: string; label?: string; maxScore: number };

// ---------- helpers ----------

function computeTotal(row: Record<string, ScoreCell> | undefined, assessmentTypes: AssessmentTypeConfig[]): number {
  if (!row) return 0;
  return assessmentTypes.reduce((sum, { type }) => {
    const val = parseFloat(row[type]?.value ?? '');
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
}

function isCellInvalid(value: string, maxScore: number): boolean {
  if (value === '') return false;
  const n = parseFloat(value);
  return isNaN(n) || n < 0 || n > maxScore;
}

// ---------- component ----------

export function ScoreEntryPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();

  // --- assessment type config (dynamic, from school settings) ---
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeConfig[]>(
    DEFAULT_ASSESSMENT_TYPES as unknown as AssessmentTypeConfig[]
  );

  // --- dropdown options ---
  const [classOptions, setClassOptions] = useState<SelectOption[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SelectOption[]>([]);
  const [termOptions, setTermOptions] = useState<SelectOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // --- filter selections ---
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');

  // --- grid state ---
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [scoreGrid, setScoreGrid] = useState<ScoreGrid>({});
  const [gridLoading, setGridLoading] = useState(false);

  // --- save state ---
  const [isSaving, setIsSaving] = useState(false);

  // ---- load dropdown options + school assessment config on mount ----
  useEffect(() => {
    setOptionsLoading(true);
    Promise.all([
      apiClient.get('/v1/classes?page=1&limit=100'),
      apiClient.get('/v1/subjects?page=1&limit=100'),
      apiClient.get('/v1/sessions?page=1&limit=100'),
      user?.schoolId ? apiClient.get(`/v1/schools/${user.schoolId}`) : Promise.resolve(null),
    ])
      .then(([classRes, subjectRes, sessionRes, schoolRes]) => {
        // Load school assessment config if available
        if (schoolRes) {
          const schoolData = schoolRes.data?.data ?? schoolRes.data;
          const config = schoolData?.assessmentConfig;
          if (Array.isArray(config) && config.length > 0) {
            setAssessmentTypes(config);
          }
        }
        const classes: SelectOption[] = (classRes.data?.data ?? []).map((c: any) => ({
          value: c.id,
          label: c.name,
        }));

        const subjects: SelectOption[] = (subjectRes.data?.data ?? []).map((s: any) => ({
          value: s.id,
          label: s.name,
        }));

        // Flatten sessions → terms
        const terms: SelectOption[] = [];
        for (const session of sessionRes.data?.data ?? []) {
          for (const term of session.terms ?? []) {
            terms.push({ value: term.id, label: term.name });
          }
        }

        setClassOptions(classes);
        setSubjectOptions(subjects);
        setTermOptions(terms);
      })
      .catch(() => {
        addToast('error', 'Failed to load filter options');
      })
      .finally(() => setOptionsLoading(false));
  }, [addToast]);

  // ---- fetch grid data when all three are selected ----
  const fetchGridData = useCallback(async (classId: string, subjectId: string, termId: string) => {
    setGridLoading(true);
    setStudents([]);
    setScoreGrid({});
    try {
      const [enrollRes, assessRes] = await Promise.all([
        apiClient.get(`/v1/enrollments/classes/${classId}/terms/${termId}`),
        apiClient.get(`/v1/assessments?subjectId=${subjectId}&termId=${termId}&page=1&limit=200`),
      ]);

      // Enrolled students
      const rawEnrollments: any[] = enrollRes.data?.data ?? enrollRes.data ?? [];
      const enrolledStudents: EnrolledStudent[] = rawEnrollments.map((e: any) => {
        const s = e.student ?? e;
        return {
          id: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admissionNumber,
        };
      });

      const enrolledIds = new Set(enrolledStudents.map((s) => s.id));

      // Existing assessments — filter client-side to only enrolled students
      const rawAssessments: ExistingAssessment[] = (
        assessRes.data?.data ?? []
      ).filter((a: any) => enrolledIds.has(a.studentId));

      // Build initial score grid
      const grid: ScoreGrid = {};
      for (const student of enrolledStudents) {
        grid[student.id] = {};
        for (const { type } of assessmentTypes) {
          const existing = rawAssessments.find(
            (a) => a.studentId === student.id && a.type === type
          );
          grid[student.id][type] = {
            value: existing ? String(existing.score) : '',
            assessmentId: existing?.id,
            isDirty: false,
          };
        }
      }

      setStudents(enrolledStudents);
      setScoreGrid(grid);
    } catch {
      addToast('error', 'Failed to load student scores');
    } finally {
      setGridLoading(false);
    }
  }, [addToast, assessmentTypes]);

  useEffect(() => {
    if (selectedClassId && selectedSubjectId && selectedTermId) {
      fetchGridData(selectedClassId, selectedSubjectId, selectedTermId);
    } else {
      setStudents([]);
      setScoreGrid({});
    }
  }, [selectedClassId, selectedSubjectId, selectedTermId, fetchGridData]);

  // ---- score cell change handler ----
  const handleScoreChange = (studentId: string, type: string, value: string) => {
    setScoreGrid((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: {
          ...prev[studentId][type],
          value,
          isDirty: true,
        },
      },
    }));
  };

  // ---- save handler ----
  const handleSave = async () => {
    // Validate all cells before saving
    for (const student of students) {
      for (const { type, maxScore } of assessmentTypes) {
        const cell = scoreGrid[student.id]?.[type];
        if (cell && isCellInvalid(cell.value, maxScore)) {
          addToast('error', `Invalid score for ${student.firstName} ${student.lastName} — ${type}`);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const bulkItems: Array<{
        studentId: string; subjectId: string; classId: string;
        termId: string; type: string; score: number; maxScore: number;
      }> = [];
      const updatePromises: Promise<any>[] = [];

      for (const student of students) {
        for (const { type, maxScore } of assessmentTypes) {
          const cell = scoreGrid[student.id]?.[type];
          if (!cell || cell.value === '') continue;
          const score = parseFloat(cell.value);
          if (isNaN(score)) continue;

          if (!cell.assessmentId) {
            bulkItems.push({
              studentId: student.id,
              subjectId: selectedSubjectId,
              classId: selectedClassId,
              termId: selectedTermId,
              type, score, maxScore,
            });
          } else if (cell.isDirty) {
            updatePromises.push(
              apiClient.put(`/v1/assessments/${cell.assessmentId}`, { score })
            );
          }
        }
      }

      const requests: Promise<any>[] = [...updatePromises];
      if (bulkItems.length > 0) {
        requests.push(apiClient.post('/v1/assessments/bulk', { assessments: bulkItems }));
      }

      if (requests.length === 0) { addToast('info', 'No changes to save'); return; }

      await Promise.all(requests);
      addToast('success', 'Scores saved successfully');
      await fetchGridData(selectedClassId, selectedSubjectId, selectedTermId);
    } catch (err: any) {
      addToast('error', err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const allSelected = Boolean(selectedClassId && selectedSubjectId && selectedTermId);
  const hasStudents = students.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Score Entry"
        description="Enter assessment scores for an entire class in one go"
        breadcrumbs={[
          { label: 'Assessments', onClick: () => navigate('/assessments') },
          { label: 'Score Entry' },
        ]}
      />

      {/* Filter dropdowns */}
      <FormSection title="Select Class, Subject &amp; Term">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            id="classId"
            label="Class"
            placeholder={optionsLoading ? 'Loading…' : 'Select class'}
            options={classOptions}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            disabled={optionsLoading}
          />
          <Select
            id="subjectId"
            label="Subject"
            placeholder={optionsLoading ? 'Loading…' : 'Select subject'}
            options={subjectOptions}
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={optionsLoading}
          />
          <Select
            id="termId"
            label="Term"
            placeholder={optionsLoading ? 'Loading…' : 'Select term'}
            options={termOptions}
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
            disabled={optionsLoading}
          />
        </div>
      </FormSection>

      {/* Grid area */}
      {allSelected && (
        <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
          {gridLoading ? (
            <div className="p-5">
              <SkeletonTable rows={6} cols={5} />
            </div>
          ) : !hasStudents ? (
            <EmptyState
              icon={<ClipboardList size={40} />}
              title="No enrolled students"
              description="There are no students enrolled in this class for the selected term."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      {assessmentTypes.map(({ type, maxScore }) => (
                        <th
                          key={type}
                          className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
                        >
                          {type}{' '}
                          <span className="text-gray-400 font-normal normal-case">
                            /{maxScore}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {students.map((student) => {
                      const row = scoreGrid[student.id] ?? {};
                      const total = computeTotal(row, assessmentTypes);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                          {/* Student name + admission number */}
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs text-gray-400">{student.admissionNumber}</p>
                          </td>

                          {/* Score inputs */}
                          {assessmentTypes.map(({ type, maxScore }) => {
                            const cell = row[type] ?? { value: '', isDirty: false };
                            const invalid = isCellInvalid(cell.value, maxScore);
                            return (
                              <td key={type} className="px-4 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxScore}
                                  value={cell.value}
                                  onChange={(e) =>
                                    handleScoreChange(student.id, type, e.target.value)
                                  }
                                  className={[
                                    'w-20 h-9 rounded-input border px-3 text-sm text-center',
                                    'bg-surface text-gray-900 placeholder-gray-400',
                                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                                    'transition-colors duration-150',
                                    invalid
                                      ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
                                      : 'border-border',
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                                  placeholder="—"
                                  aria-label={`${student.firstName} ${student.lastName} ${type} score`}
                                />
                                {invalid && (
                                  <p className="mt-0.5 text-xs text-danger-600">
                                    0–{maxScore}
                                  </p>
                                )}
                              </td>
                            );
                          })}

                          {/* Computed total */}
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-gray-900 tabular-nums">
                              {total}
                            </span>
                            <span className="text-xs text-gray-400">
                              {' '}/ {assessmentTypes.reduce((s, t) => s + t.maxScore, 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/assessments')}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  loading={isSaving}
                  onClick={handleSave}
                >
                  Save All Scores
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
