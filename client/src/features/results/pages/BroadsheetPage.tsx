import { useState, useEffect } from 'react';
import { resultService } from '../../../services/resultService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { subjectService } from '../../../services/subjectService';
import { BroadsheetData } from '../../../types/result';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';
import { Subject } from '../../../types/subject';

export function BroadsheetPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [broadsheet, setBroadsheet] = useState<BroadsheetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
      subjectService.getAll(1, 100),
    ]).then(([classesRes, sessionsRes, subjectsRes]) => {
      setClasses(classesRes.data.filter(c => c.isActive));
      setSubjects(subjectsRes.data.filter(s => s.isActive));
      const flattenedTerms: Term[] = [];
      for (const s of sessionsRes.data) {
        if (s.terms) flattenedTerms.push(...s.terms);
      }
      setTerms(flattenedTerms);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const loadBroadsheet = async () => {
    if (!selectedClassId || !selectedTermId) {
      setError('Please select a class and term');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await resultService.getBroadsheet(selectedClassId, selectedTermId);
      setBroadsheet(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load broadsheet');
      setBroadsheet(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompute = async () => {
    if (!selectedClassId || !selectedTermId) {
      setError('Please select a class and term');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsComputing(true);
    try {
      const response = await resultService.compute({
        classId: selectedClassId,
        termId: selectedTermId,
        subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
      });
      setSuccess(`Computed ${response.data.computedCount} result(s) for ${response.data.studentCount} student(s) across ${response.data.subjectCount} subject(s)`);
      loadBroadsheet();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to compute results');
    } finally {
      setIsComputing(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedClassId || !selectedTermId) return;
    if (!window.confirm('Publish all results for this class/term? This will make them visible to students.')) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await resultService.publish({
        classId: selectedClassId,
        termId: selectedTermId,
        subjectIds: selectedSubjectIds.length > 0 ? selectedSubjectIds : undefined,
      });
      setSuccess(`Published ${response.data.publishedCount} result(s)`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish results');
    }
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadsheet</h1>
        <p className="mt-1 text-sm text-gray-500">Class-wide results matrix with rankings</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}
      {success && <div className="rounded-md bg-green-50 p-4"><p className="text-sm text-green-700">{success}</p></div>}

      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name} (Level {c.level})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Term *</label>
            <select className="input" value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
              <option value="">Select term</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Subjects (leave empty for all)</label>
          <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {subjects.map(s => (
                <label key={s.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedSubjectIds.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <span>{s.name} ({s.code})</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
          <button onClick={loadBroadsheet} disabled={isLoading || !selectedClassId || !selectedTermId} className="btn-secondary disabled:opacity-50">
            {isLoading ? 'Loading...' : 'View Broadsheet'}
          </button>
          <button onClick={handleCompute} disabled={isComputing || !selectedClassId || !selectedTermId} className="btn-primary disabled:opacity-50">
            {isComputing ? 'Computing...' : 'Compute Results'}
          </button>
          <button onClick={handlePublish} disabled={!selectedClassId || !selectedTermId} className="btn-secondary disabled:opacity-50">
            Publish Results
          </button>
        </div>
      </div>

      {broadsheet && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {broadsheet.class.name} — {broadsheet.students.length} students, {broadsheet.subjects.length} subjects
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header sticky left-0 bg-gray-50 z-10">Pos</th>
                  <th className="table-header sticky left-12 bg-gray-50 z-10 min-w-[200px]">Student</th>
                  {broadsheet.subjects.map(s => (
                    <th key={s.id} className="table-header text-center">{s.code}</th>
                  ))}
                  <th className="table-header text-center font-bold">Total</th>
                  <th className="table-header text-center font-bold">Avg</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {broadsheet.students.length === 0 ? (
                  <tr><td colSpan={broadsheet.subjects.length + 4} className="px-6 py-12 text-center text-gray-500">No students enrolled</td></tr>
                ) : broadsheet.students.map(entry => (
                  <tr key={entry.student.id} className="hover:bg-gray-50">
                    <td className="table-cell font-bold text-center">{entry.position}</td>
                    <td className="table-cell sticky left-12 bg-white font-medium text-gray-900">
                      {entry.student.firstName} {entry.student.lastName}
                      <div className="text-xs text-gray-500">{entry.student.admissionNumber}</div>
                    </td>
                    {broadsheet.subjects.map(s => {
                      const score = entry.subjectScores[s.code];
                      return (
                        <td key={s.id} className="table-cell text-center">
                          {score ? (
                            <div>
                              <div className="font-semibold">{score.score.toFixed(0)}</div>
                              {score.grade && <div className="text-xs text-gray-500">{score.grade}</div>}
                            </div>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td className="table-cell text-center font-bold text-primary-700">{entry.totalScore.toFixed(0)}</td>
                    <td className="table-cell text-center font-semibold">{entry.averageScore.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}