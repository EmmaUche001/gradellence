import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Calculator, Send, Download } from 'lucide-react';
import { downloadPdf } from '../../../utils/downloadPdf';
import { useToastStore } from '../../../store/toastStore';
import { resultService } from '../../../services/resultService';
import { classService } from '../../../services/classService';
import { sessionService } from '../../../services/sessionService';
import { subjectService } from '../../../services/subjectService';
import { BroadsheetData } from '../../../types/result';
import { Class } from '../../../types/class';
import { Term } from '../../../types/session';
import { Subject } from '../../../types/subject';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { FormSection } from '../../../components/ui/FormSection';
import { Badge, BadgeVariant } from '../../../components/ui/Badge';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { SkeletonTable } from '../../../components/ui/SkeletonLoader';
import { EmptyState } from '../../../components/ui/EmptyState';

function gradeBadge(grade: string | null): BadgeVariant {
  if (!grade) return 'gray';
  if (grade.startsWith('A')) return 'success';
  if (grade.startsWith('B')) return 'primary';
  if (grade.startsWith('C')) return 'info';
  if (grade.startsWith('D')) return 'warning';
  return 'danger';
}

export function BroadsheetPage() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const [classes, setClasses]   = useState<Class[]>([]);
  const [terms, setTerms]       = useState<Term[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [broadsheet, setBroadsheet]         = useState<BroadsheetData | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [isComputing, setIsComputing]       = useState(false);
  const [isPublishing, setIsPublishing]     = useState(false);
  const [showPublishConfirm, setPublishConfirm] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [success, setSuccess]               = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId]         = useState('');
  const [selectedTermId, setSelectedTermId]           = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds]   = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      classService.getAll(1, 100),
      sessionService.getAll(1, 100),
      subjectService.getAll(1, 100),
    ]).then(([cr, sesr, subr]) => {
      setClasses(cr.data.filter(c => c.isActive));
      setSubjects(subr.data.filter(s => s.isActive));
      const flat: Term[] = [];
      for (const s of sesr.data) if (s.terms) flat.push(...s.terms);
      setTerms(flat);
    }).catch(() => setError('Failed to load form data'));
  }, []);

  const loadBroadsheet = async () => {
    if (!selectedClassId || !selectedTermId) { setError('Select a class and term first.'); return; }
    setError(null); setIsLoading(true);
    try {
      const res = await resultService.getBroadsheet(selectedClassId, selectedTermId);
      setBroadsheet(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load broadsheet');
      setBroadsheet(null);
    } finally { setIsLoading(false); }
  };

  const handleCompute = async () => {
    if (!selectedClassId || !selectedTermId) { setError('Select a class and term first.'); return; }
    setError(null); setSuccess(null); setIsComputing(true);
    try {
      const res = await resultService.compute({
        classId: selectedClassId, termId: selectedTermId,
        subjectIds: selectedSubjectIds.length ? selectedSubjectIds : undefined,
      });
      setSuccess(`Computed ${res.data.computedCount} result(s) for ${res.data.studentCount} student(s) across ${res.data.subjectCount} subject(s).`);
      loadBroadsheet();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to compute results');
    } finally { setIsComputing(false); }
  };

  const handlePublish = async () => {
    setIsPublishing(true); setError(null); setSuccess(null);
    try {
      const res = await resultService.publish({
        classId: selectedClassId, termId: selectedTermId,
        subjectIds: selectedSubjectIds.length ? selectedSubjectIds : undefined,
      });
      setSuccess(`Published ${res.data.publishedCount} result(s) successfully.`);
      setPublishConfirm(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to publish results');
      setPublishConfirm(false);
    } finally { setIsPublishing(false); }
  };

  const toggleSubject = (id: string) =>
    setSelectedSubjectIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // handleDownloadReportCard - not implemented yet
  // const handleDownloadReportCard = async () => {
  //   if (!selectedClassId || !selectedTermId) { setError('Select a class and term first.'); return; }
  //   setDownloadingPdf(true);
  //   try {
  //     const response = await resultService.getBroadsheet(selectedClassId, selectedTermId);
  //     // response.data is Blob (from axios with responseType: 'blob')
  //     const blob = response.data as Blob;
  //     const url  = URL.createObjectURL(blob);
  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = `broadsheet-${broadsheet?.class?.name ?? 'class'}.pdf`;
  //     document.body.appendChild(link);
  //     link.click();
  //     link.remove();
  //     URL.revokeObjectURL(url);
  //     addToast('success', 'Broadsheet PDF downloaded successfully');
  //   } catch (err: any) {
  //     const msg = err.response?.data?.message || 'Failed to download broadsheet PDF';
  //     setError(msg);
  //     addToast('error', msg);
  //   } finally { setDownloadingPdf(false); }
  // };

  const handleDownloadZip = async () => {
    if (!selectedClassId || !selectedTermId) { setError('Select a class and term first.'); return; }
    setDownloadingZip(true);
    try {
      const response = await resultService.downloadClassReportCards(selectedClassId, selectedTermId);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report-cards-${broadsheet?.class?.name ?? 'class'}-${selectedTermId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      addToast('success', 'All report cards downloaded successfully');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to download report cards ZIP';
      setError(msg);
      addToast('error', msg);
    } finally { setDownloadingZip(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadsheet"
        description="Class-wide results matrix with rankings"
        breadcrumbs={[{ label: 'Results', onClick: () => navigate('/results') }, { label: 'Broadsheet' }]}
      />

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-50 border border-danger-100">
          <AlertCircle size={16} className="text-danger-600 shrink-0 mt-0.5" />
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-success-50 border border-success-100">
          <CheckCircle2 size={16} className="text-success-600 shrink-0 mt-0.5" />
          <p className="text-sm text-success-700">{success}</p>
        </div>
      )}

      {/* Filter controls */}
      <FormSection title="Select Class & Term">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              id="classId" label="Class *"
              options={classes.map(c => ({ value: c.id, label: `${c.name} (Level ${c.level})` }))}
              placeholder="Select class"
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
            />
            <Select
              id="termId" label="Term *"
              options={terms.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Select term"
              value={selectedTermId}
              onChange={e => setSelectedTermId(e.target.value)}
            />
          </div>

          {/* Subject filter (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Subjects <span className="text-gray-400 font-normal">(leave empty for all)</span>
            </label>
            <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {subjects.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded-lg hover:bg-surface">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(s.id)}
                      onChange={() => toggleSubject(s.id)}
                      className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700">{s.name}</span>
                    <span className="text-gray-400 text-xs">({s.code})</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={loadBroadsheet}
              loading={isLoading}
              disabled={!selectedClassId || !selectedTermId}
            >
              View Broadsheet
            </Button>
            <Button
              variant="primary"
              onClick={handleCompute}
              loading={isComputing}
              disabled={!selectedClassId || !selectedTermId}
            >
              <Calculator size={15} /> Compute Results
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPublishConfirm(true)}
              disabled={!selectedClassId || !selectedTermId || !broadsheet}
            >
              <Send size={15} /> Publish Results
            </Button>
            <Button
              variant="secondary"
              onClick={() => downloadPdf(
                `/v1/results/broadsheet-pdf/${selectedClassId}/${selectedTermId}`,
                `broadsheet-${broadsheet?.class?.name ?? 'class'}.pdf`,
                () => setDownloadingPdf(true),
                () => setDownloadingPdf(false),
                (msg) => setError(msg),
              )}
              loading={downloadingPdf}
              disabled={!selectedClassId || !selectedTermId || !broadsheet}
            >
              <Download size={15} /> Download PDF
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadZip}
              disabled={!selectedClassId || !selectedTermId || !downloadingZip}
              className="ml-2"
            >
              <Download size={15} /> Download All ZIP
            </Button>
          </div>
        </div>
      </FormSection>

      {/* Broadsheet table */}
      {isLoading ? (
        <SkeletonTable rows={8} cols={6} />
      ) : broadsheet ? (
        <div className="bg-surface rounded-card shadow-sm border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h3 className="text-card-title text-gray-900">{broadsheet.class.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {broadsheet.students.length} student{broadsheet.students.length !== 1 ? 's' : ''} ·{' '}
                {broadsheet.subjects.length} subject{broadsheet.subjects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => downloadPdf(
                `/v1/results/broadsheet-pdf/${selectedClassId}/${selectedTermId}`,
                `broadsheet-${broadsheet.class.name}.pdf`,
                () => setDownloadingPdf(true),
                () => setDownloadingPdf(false),
                (msg) => setError(msg),
              )}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Download size={14} /> PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 sticky left-0 bg-gray-50">Pos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px] sticky left-12 bg-gray-50">Student</th>
                  {broadsheet.subjects.map(s => (
                    <th key={s.id} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[70px]">
                      {s.code}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-primary-50">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider bg-primary-50">Avg</th>
                </tr>
              </thead>
              <tbody>
                {broadsheet.students.length === 0 ? (
                  <tr>
                    <td colSpan={broadsheet.subjects.length + 4} className="px-5 py-12 text-center">
                      <EmptyState
                        title="No students enrolled"
                        description="Enrol students in this class to generate results."
                      />
                    </td>
                  </tr>
                ) : broadsheet.students.map(entry => (
                  <tr key={entry.student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-center text-gray-700 sticky left-0 bg-surface">{entry.position}</td>
                    <td className="px-4 py-3 sticky left-12 bg-surface">
                      <p className="font-semibold text-gray-900">{entry.student.firstName} {entry.student.lastName}</p>
                      <p className="text-xs text-gray-40">{entry.student.admissionNumber}</p>
                    </td>
                    {broadsheet.subjects.map(s => {
                      const score = entry.subjectScores[s.code];
                      return (
                        <td key={s.id} className="px-4 py-3 text-center">
                          {score ? (
                            <div>
                              <span className="font-semibold text-gray-900">{score.score.toFixed(0)}</span>
                              {score.grade && (
                                <div className="mt-0.5">
                                  <Badge variant={gradeBadge(score.grade)}>{score.grade}</Badge>
                                </div>
                              )}
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold text-primary-700 bg-primary-50/40">
                      {entry.totalScore.toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700 bg-primary-50/40">
                      {entry.averageScore.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={showPublishConfirm}
        onClose={() => setPublishConfirm(false)}
        onConfirm={handlePublish}
        variant="primary"
        title="Publish results?"
        message="All results for this class and term will be published and made visible. This action cannot be undone."
        confirmLabel="Publish"
        loading={isPublishing}
      />
    </div>
  );
}