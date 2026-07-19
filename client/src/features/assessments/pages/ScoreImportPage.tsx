import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { scoreImportApi } from '../services/scoreImportApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';

interface ImportResult {
  successCount: number;
  failureCount: number;
  errors?: Array<{ row: number; column?: string; message: string }>;
}

export const ScoreImportPage: React.FC = () => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [error, setError]         = useState('');
  const [dragging, setDragging]   = useState(false);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Only CSV files are supported.'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await scoreImportApi.uploadCsv(file);
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed. Please check your CSV format.');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="Import Assessment Scores"
        description="Upload a CSV file to bulk-import student scores"
        breadcrumbs={[{ label: 'Assessments', onClick: () => navigate('/assessments') }, { label: 'Import' }]}
      />

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'bg-surface rounded-card border-2 border-dashed p-10 flex flex-col items-center justify-center cursor-pointer transition-colors duration-150',
            dragging ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-400 hover:bg-gray-50',
          ].join(' ')}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={e => handleFile(e.target.files?.[0] ?? null)} />

          {file ? (
            <>
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-3">
                <FileText size={24} className="text-primary-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger-600 hover:text-danger-700"
              >
                <X size={13} /> Remove
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Upload size={24} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Drop your CSV here, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">CSV format only · Max 5MB</p>
            </>
          )}
        </div>

        {/* CSV format hint */}
        <div className="bg-gray-50 rounded-xl border border-border p-4 text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-700 mb-2">Expected CSV columns:</p>
          <code className="block bg-surface rounded-lg border border-border px-3 py-2 font-mono text-gray-800 leading-relaxed">
            admissionNumber, subjectCode, termName, type, score, maxScore
          </code>
          <p className="text-gray-400 mt-2">Rows with errors are skipped — valid rows will still be imported.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
            <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
            <p className="text-sm text-danger-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate('/assessments')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!file} loading={loading}>
            <Upload size={15} /> Import Scores
          </Button>
        </div>
      </form>

      {/* Result summary */}
      {result && (
        <div className="space-y-4">
          <div className={`flex items-start gap-3 px-4 py-4 rounded-xl border ${
            result.failureCount === 0
              ? 'bg-success-50 border-success-100'
              : 'bg-warning-50 border-warning-100'
          }`}>
            {result.failureCount === 0
              ? <CheckCircle2 size={18} className="text-success-600 shrink-0 mt-0.5" />
              : <AlertCircle size={18} className="text-warning-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {result.successCount} score{result.successCount !== 1 ? 's' : ''} imported successfully
              </p>
              {result.failureCount > 0 && (
                <p className="text-sm text-warning-700 mt-0.5">
                  {result.failureCount} row{result.failureCount !== 1 ? 's' : ''} failed — see details below
                </p>
              )}
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
              <div className="px-5 py-3 border-b border-border bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">Import Errors</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-border">
                      {['Row', 'Column', 'Error'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.errors.map((e, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm text-gray-700 tabular-nums">{e.row}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{e.column || '—'}</td>
                        <td className="px-5 py-3 text-sm text-danger-600">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
