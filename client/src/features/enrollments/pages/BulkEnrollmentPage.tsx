import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { enrollmentService } from '../../../services/enrollmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';

export function BulkEnrollmentPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 100),
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([studentsRes, classesRes, sessionsRes]) => {
      setStudents(studentsRes.data.filter(s => s.isActive));
      setClasses(classesRes.data.filter(c => c.isActive));
      const flattenedTerms: Term[] = [];
      for (const s of sessionsRes.data) {
        if (s.terms) flattenedTerms.push(...s.terms);
      }
      setTerms(flattenedTerms);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const filteredStudents = students.filter(s =>
    s.firstName.toLowerCase().includes(search.toLowerCase()) ||
    s.lastName.toLowerCase().includes(search.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(search.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const toggleAll = () => {
    if (filteredStudents.every(s => selectedStudentIds.has(s.id))) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const onSubmit = async () => {
    if (selectedStudentIds.size === 0) {
      setError('Please select at least one student');
      return;
    }
    if (!selectedClassId || !selectedTermId) {
      setError('Please select a class and term');
      return;
    }
    if (!window.confirm(`Enroll ${selectedStudentIds.size} students?`)) return;

    setIsLoading(true);
    setError(null);
    try {
      await enrollmentService.bulkEnroll({
        studentIds: Array.from(selectedStudentIds),
        classId: selectedClassId,
        termId: selectedTermId,
      });
      navigate('/enrollments');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to bulk enroll students');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Enrollment</h1>
        <p className="mt-1 text-sm text-gray-500">Assign multiple students to a class at once</p>
      </div>

      {error && <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>}

      <div className="card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
              <option value="">Select a class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.academicYear})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Term *</label>
            <select className="input" value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)}>
              <option value="">Select a term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label !mb-0">Select Students ({selectedStudentIds.size} selected)</label>
            <button type="button" onClick={toggleAll} className="text-sm text-primary-600 hover:text-primary-800">
              Toggle All
            </button>
          </div>
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input mb-3"
          />
          <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
            {filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No students found</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredStudents.map((s) => (
                  <li key={s.id} className="p-3 hover:bg-gray-50 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 text-primary-600 rounded"
                    />
                    <span className="ml-3 text-sm">
                      <span className="font-medium text-gray-900">{s.firstName} {s.lastName}</span>
                      <span className="ml-2 text-gray-500">({s.admissionNumber})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
          <button type="button" onClick={() => navigate('/enrollments')} className="btn-secondary">Cancel</button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isLoading || selectedStudentIds.size === 0}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Enrolling...' : `Enroll ${selectedStudentIds.size} Student(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}