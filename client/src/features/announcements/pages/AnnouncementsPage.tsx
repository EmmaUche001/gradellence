import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Trash2, Clock } from 'lucide-react';
import { announcementService } from '../../../services/announcementService';
import { Announcement } from '../../../types/announcement';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonCard } from '../../../components/ui/SkeletonLoader';
import { useToastStore } from '../../../store/toastStore';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function AnnouncementsPage() {
  const { addToast } = useToastStore();
  const [items, setItems]                     = useState<Announcement[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [deleteTarget, setDeleteTarget]       = useState<Announcement | null>(null);
  const [deleting, setDeleting]               = useState(false);

  // Form state
  const [title, setTitle]   = useState('');
  const [body, setBody]     = useState('');
  const [date, setDate]     = useState(() => new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<{ title?: string; date?: string }>({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAll(1, 20);
      setItems(res.data ?? []);
    } catch {
      addToast('error', 'Failed to load announcements');
    } finally { setLoading(false); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => {
    setTitle(''); setBody(''); setDate(new Date().toISOString().split('T')[0]);
    setErrors({}); setShowModal(true);
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await announcementService.create({ title: title.trim(), body: body.trim() || undefined, date });
      addToast('success', 'Announcement posted');
      setShowModal(false);
      fetch();
    } catch (e: any) {
      addToast('error', e.response?.data?.message || 'Failed to post announcement');
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await announcementService.remove(deleteTarget.id);
      addToast('success', 'Announcement deleted');
      setDeleteTarget(null); fetch();
    } catch {
      addToast('error', 'Failed to delete');
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Post school-wide notices visible on the dashboard"
        actions={
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={15} /> New Announcement
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-surface rounded-card border border-border">
          <EmptyState
            icon={<Megaphone size={40} />}
            title="No announcements yet"
            description="Post your first announcement to keep staff informed."
            actionLabel="New Announcement"
            onAction={openCreate}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(item => (
            <div key={item.id}
              className="bg-surface rounded-card p-5 shadow-sm border border-border hover:-translate-y-0.5 hover:shadow-md transition-all duration-150">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                  <Megaphone size={17} className="text-primary-600" />
                </div>
                <button onClick={() => setDeleteTarget(item)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                  aria-label="Delete announcement">
                  <Trash2 size={15} />
                </button>
              </div>

              <h3 className="text-sm font-bold text-gray-900 leading-snug mb-1.5">{item.title}</h3>

              {item.body && (
                <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{item.body}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Clock size={11} />
                  <span>{formatDate(item.date)}</span>
                </div>
                {item.author && (
                  <span className="text-xs text-gray-400">
                    {item.author.firstName} {item.author.lastName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Announcement"
        description="This will appear on the school dashboard for all staff."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Post Announcement</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            id="ann-title"
            label="Title *"
            placeholder="e.g. School resumes Monday"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={errors.title}
          />
          <Input
            id="ann-date"
            type="date"
            label="Date *"
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Details <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="Additional details about this announcement..."
              className="w-full rounded-input border border-border px-4 py-3 text-sm text-gray-900 placeholder-gray-400
                bg-surface focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete announcement?"
        message={`"${deleteTarget?.title}" will be permanently removed from the dashboard.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
