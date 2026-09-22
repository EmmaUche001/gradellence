import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  ChevronRight, Download, X, GraduationCap, Info,
} from 'lucide-react';
import { studentImportApi } from '../services/studentImportApi';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { useToastStore } from '../../../store/toastStore';
import apiClient from '../../../services/apiClient';

interface ImportError {
  row: number;
  column?: string;
  message: string;
}

interface ImportResult {
  successCount: number;
  failureCount: number;
  errors?: ImportError[];
  enrolled?: number;
}

interface SelectOption {
  value: string;
  label: string;
}

// CSV template content
const CSV_TEMPLATE = `firstName,lastName,admissionNumber,dateOfBirth,gender,address,phone,email,parentName,parentPhone,parentEmail
John,Doe,STU001,2005-03-15,Male,123 School Road,08012345678,john@example.com,Mr. Samuel Doe,08012345679,samueldoe@example.com
Jane,Smith,,2006-07-22,Female,456 Main Street,08087654321,,,
`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'students_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function StudentImportPage() {
  const navigate     = useNavigate();
  const { addToast } = useToastStore();
  const inputRef     = useRef<HTMLInputElement>(null);

  const [file, setFile]         = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);

  // Class + term for optional auto-enrollment
  const [classOptions, setClassOptions]   = useState<SelectOption[]>([]);
  const [termOptions, setTermOptions]     = useState<SelectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTermId, setSelectedTermId]   = useState('');
  const [optionsLoading, setOptionsLoading]   = useState(true);

  // Load class + term options
  useEffect(() => {
    setOptionsLoading(true);
    Promise.all([
      apiClient.get('/v1/classes?page=1&limit=100'),
      apiClient.get('/v1/sessions?page=1&limit=100'),
    ])
      .then(([classRes, sessionRes]) => {
        setClassOptions(
          (classRes.data?.data ?? []).map((c: any) => ({ value: c.id, label: c.name }))
        );
        const terms: SelectOption[] = [];
        for (const session of sessionRes.data?.data ?? []) {
          for (const term of session.terms ?? []) {
            terms.push({ value: term.id, label: `${term.name} — ${session.name}` });
          }
        }
        setTermOptions(terms);
      })
      .catch(() => {})
      .finally(() => setOptionsLoading(false));
  }, []);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      addToast('error', 'Only CSV files are accepted');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // If only one of class/term is selected, require both
    if ((selectedClassId && !selectedTermId) || (!selectedClassId && selectedTermId)) {
      addToast('warning', 'Please select both a class and a term to auto-enroll, or leave both empty to skip enrollment');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await studentImportApi.uploadCsv(
        file,
        selectedClassId || undefined,
        selectedTermId  || undefined,
      );
      const data = res.data?.data ?? res.data;
      setResult(data);
      if (data?.successCount > 0) {
        const enrollMsg = data.enrolled > 0 ? ` and enrolled ${data.enrolled} into class` : '';
        addToast('success', `${data.successCount} student${data.successCount !== 1 ? 's' : ''} imported${enrollMsg}`);
      }
    } catch (err: any) {
      addToast('error', err?.response?.data?.error?.message || err?.response?.data?.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">

      {/* Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <span>Dashboard</span>
          <ChevronRight size={12} />
          <button onClick={() => navigate('/students')} className="hover:text-gray-700">Students</button>
          <ChevronRight size={12} />
          <span className="text-gray-700 font-medium">Import CSV</span>
        </nav>
        <h1 className="text-page-title text-gray-900">Import Students</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload a CSV file to bulk-add students. Optionally enroll them into a class and term immediately.
        </p>
      </div>

      {/* Template download */}
      <div className="bg-info-50 border border-info-100 rounded-card p-4 flex items-start gap-3">
        <FileText size={18} className="text-info-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-info-900">Use the official template</p>
          <p className="text-xs text-info-700 mt-0.5">
            Required columns: <code className="font-mono bg-info-100 px-1 rounded">firstName, lastName</code>.
            Optional: <code className="font-mono bg-info-100 px-1 rounded">admissionNumber, dateOfBirth, gender, address, phone, email, parentName, parentPhone, parentEmail</code>.
            Column names are flexible — "First Name", "first_name" and "FIRSTNAME" are all accepted.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={downloadTemplate} className="shrink-0">
          <Download size={14} /> Template
        </Button>
      </div>

      {/* Upload card */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h3 className="text-card-title text-gray-900">Upload File</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
            className={[
              'relative flex flex-col items-center justify-center gap-3 h-44 rounded-xl border-2 border-dashed transition-colors duration-150',
              file ? 'border-success-400 bg-success-50 cursor-default' :
                dragOver ? 'border-primary-400 bg-primary-50 cursor-copy' :
                'border-border bg-gray-50 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />

            {file ? (
              <>
                <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center">
                  <FileText size={22} className="text-success-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); reset(); }}
                  className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Remove file"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Upload size={22} className="text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drag & drop your CSV here</p>
                  <p className="text-xs text-gray-400 mt-0.5">or click to browse — CSV files only</p>
                </div>
              </>
            )}
          </div>

          {/* Optional auto-enrollment */}
          <div className="rounded-xl border border-border bg-gray-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-primary-500 shrink-0" />
              <p className="text-sm font-semibold text-gray-800">Auto-enroll into a class (optional)</p>
            </div>
            <p className="text-xs text-gray-500">
              Select a class and term to automatically enroll all imported students. If left empty, students are created
              but not enrolled — you'll need to enroll them manually before entering scores.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                id="classId"
                label="Class"
                placeholder={optionsLoading ? 'Loading…' : 'Skip — enroll later'}
                options={classOptions}
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                disabled={optionsLoading}
              />
              <Select
                id="termId"
                label="Term"
                placeholder={optionsLoading ? 'Loading…' : 'Skip — enroll later'}
                options={termOptions}
                value={selectedTermId}
                onChange={e => setSelectedTermId(e.target.value)}
                disabled={optionsLoading}
              />
            </div>
            {selectedClassId && selectedTermId && (
              <p className="text-xs text-success-700 flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                Students will be imported <strong>and</strong> enrolled automatically
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate('/students')} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={!file} loading={loading}>
              <Upload size={15} /> Import Students
            </Button>
          </div>
        </form>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">

          {/* Summary row */}
          <div className="px-6 py-5 border-b border-border flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-success-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-success-700">{result.successCount}</p>
                <p className="text-xs text-gray-500">Imported successfully</p>
              </div>
            </div>
            {(result.enrolled ?? 0) > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <GraduationCap size={18} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-700">{result.enrolled}</p>
                  <p className="text-xs text-gray-500">Auto-enrolled</p>
                </div>
              </div>
            )}
            {result.failureCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center">
                  <AlertCircle size={18} className="text-danger-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-danger-700">{result.failureCount}</p>
                  <p className="text-xs text-gray-500">Rows failed</p>
                </div>
              </div>
            )}
          </div>

          {/* Enrollment hint when no auto-enroll happened */}
          {result.successCount > 0 && (result.enrolled ?? 0) === 0 && (
            <div className="px-6 py-3 bg-warning-50 border-b border-warning-100 flex items-start gap-2">
              <AlertCircle size={15} className="text-warning-600 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-800">
                <strong>Next step:</strong> These students are not enrolled in any class yet. Go to{' '}
                <button
                  onClick={() => navigate('/enrollments')}
                  className="underline font-semibold hover:text-warning-900"
                >
                  Enrollments
                </button>{' '}
                to assign them to a class and term before entering scores.
              </p>
            </div>
          )}

          {/* Error table */}
          {result.errors && result.errors.length > 0 && (
            <div className="overflow-x-auto">
              <div className="px-6 py-3 bg-danger-50 border-b border-danger-100">
                <p className="text-xs font-semibold text-danger-700 uppercase tracking-wider">
                  Row Errors ({result.errors.length})
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Row</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Column</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {result.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-600 font-mono">{err.row}</td>
                      <td className="px-5 py-3 text-gray-600 font-mono">{err.column || '—'}</td>
                      <td className="px-5 py-3 text-danger-600">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* CTA after success */}
          {result.successCount > 0 && (
            <div className="px-6 py-4 bg-success-50 border-t border-success-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-success-700">
                <GraduationCap size={16} />
                <span>{result.successCount} student{result.successCount !== 1 ? 's' : ''} added to your school</span>
              </div>
              <div className="flex items-center gap-2">
                {(result.enrolled ?? 0) > 0 && (
                  <Button variant="secondary" size="sm" onClick={() => navigate('/assessments/score-entry')}>
                    Enter Scores
                  </Button>
                )}
                <Button variant="primary" size="sm" onClick={() => navigate('/students')}>
                  View Students
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
