import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, AlertCircle, CheckSquare } from 'lucide-react';
import { enrollmentService } from '../../../services/enrollmentService';
import { studentService } from '../../../services/studentService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { Student } from '../../../types/student';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { FormSection } from '../../../components/ui/FormSection';

export function BulkEnrollmentPage() {
  const navigate = useNavigate();
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses]   = useState<Class[]>([]);
  const [terms, setTerms]       = useState<Term[]>([]);

  const [selectedClassId, setSelectedClassId]     = useState('');
  const [selectedTermId, setSelectedTermId]       = useState('');
  const [selectedStudentIds, setSelected]         = useState<Set<string>>(new Set());
  const [search, setSearch]                       = useState('');
  const [showConfirm, setShowConfirm]             = useState(false);

  useEffect(() => {
    Promise.all([
      studentService.getAll(1, 500),
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
    ]).then(([sr, cr, sesr]) => {
      setStudents(sr.data.filter(s => s.isActive));
      setClasses(cr.data.filter(c => c.isActive));
      const flat: Term[] = [];
      for (const s of sesr.data) if (s.terms) flat.push(...s.terms);
      setTerms(flat);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q)
    );
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selectedStudentIds.has(s.id));

  const toggleStudent = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(s => n.delete(s.id)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...filtered.map(s => s.id)]));
    }
  };

  const handleConfirm = async () => {
    if (!selectedClassId || !selectedTermId || selectedStudentIds.size === 0) return;
    setSaving(true); setError(null);
    try {
      await enrollmentService.bulkEnroll({
        studentIds: Array.from(selectedStudentIds),
        classId: selectedClassId,
        termId: selectedTermId,
      });
      navigate('/enrollments');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to enrol students');
      setShowConfirm(false);
    } finally { setSaving(false); }
  };

  const canSubmit = selectedStudentIds.size > 0 && selectedClassId && selectedTermId;
  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Bulk Enrollment"
        description="Assign multiple students to a class at once"
        breadcrumbs={[{ label: 'Enrollments', onClick: () => navigate('/enrollments') }, { label: 'Bulk Enroll' }]}
      />

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Target class & term */}
        <FormSection title="Target Class & Term">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="classId" label="Class *"
              options={classes.map(c => ({ value: c.id, label: `${c.name} (Level ${c.level})` }))}
              placeholder="Select a class"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            />
            <Select
              id="termId" label="Term *"
              options={terms.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select a term"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
            />
          </div>
        </FormSection>

        {/* Student selector */}
        <FormSection
          title={`Select Students`}
          description={selectedStudentIds.size > 0 ? `${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''} selected` : 'Select one or more students to enrol'}
        >
          {/* Search + select-all toolbar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or admission number…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-sm bg-gray-50 border border-border rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-surface placeholder-gray-400"
              />
            </div>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 shrink-0"
            >
              <CheckSquare size={15} />
              {allFilteredSelected ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Student list */}
          <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-sm text-gray-400">
                <Users size={28} className="mb-2 text-gray-300" />
                {search ? `No students match "${search}"` : 'No active students found'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map(s => {
                  const checked = selectedStudentIds.has(s.id);
                  return (
                    <li
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-primary-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${checked ? 'text-primary-700' : 'text-gray-900'}`}>
                          {s.firstName} {s.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{s.admissionNumber}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </FormSection>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate('/enrollments')}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => setShowConfirm(true)}
            disabled={!canSubmit}
          >
            <Users size={15} /> Enrol {selectedStudentIds.size > 0 ? `${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? 's' : ''}` : 'Students'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        variant="primary"
        title="Confirm bulk enrollment"
        message={`Enrol ${selectedStudentIds.size} student${selectedStudentIds.size !== 1 ? 's' : ''} into ${selectedClass?.name ?? 'the selected class'}? Existing enrollments for the same term will be skipped.`}
        confirmLabel="Enrol"
        loading={saving}
      />
    </div>
  );
}
