import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Megaphone, BookMarked, BarChart2, Shield, Info, X } from 'lucide-react';
import { notificationService, Notification } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';

// ── Relative time helper ─────────────────────────────────────────────────────
function relTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

// ── Icon per notification type ───────────────────────────────────────────────
function TypeIcon({ type }: { type: Notification['type'] }) {
  const map = {
    RESULT_PUBLISHED: { icon: BarChart2,  bg: 'bg-success-100', color: 'text-success-600' },
    ASSIGNMENT:       { icon: BookMarked, bg: 'bg-primary-100',  color: 'text-primary-600' },
    ANNOUNCEMENT:     { icon: Megaphone,  bg: 'bg-warning-100',  color: 'text-warning-600' },
    ROLE_CHANGED:     { icon: Shield,     bg: 'bg-info-100',     color: 'text-info-600'    },
    SYSTEM:           { icon: Info,       bg: 'bg-gray-100',     color: 'text-gray-500'    },
  };
  const { icon: Icon, bg, color } = map[type] ?? map.SYSTEM;
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
      <Icon size={15} className={color} />
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function NotificationDropdown() {
  const navigate             = useNavigate();
  const { isAuthenticated }  = useAuthStore();
  const panelRef             = useRef<HTMLDivElement>(null);

  const [open, setOpen]              = useState(false);
  const [hasUnread, setHasUnread]    = useState(false);
  const [notifications, setNotifs]   = useState<Notification[]>([]);
  const [loading, setLoading]        = useState(false);

  // ── Poll unread count every 30 s ─────────────────────────────────────────
  const fetchCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      setHasUnread((res.data?.count ?? 0) > 0);
    } catch { /* silent */ }
  }, [isAuthenticated]);

  useEffect(() => {
    // Delay initial poll by 3 s to avoid firing during server startup / login
    const init = setTimeout(fetchCount, 3000);
    const id   = setInterval(fetchCount, 30_000);
    return () => { clearTimeout(init); clearInterval(id); };
  }, [fetchCount]);

  // ── Load inbox when panel opens ──────────────────────────────────────────
  const fetchInbox = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getInbox(1, 15);
      setNotifs(res.data ?? []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) fetchInbox();
  }, [open, fetchInbox]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await notificationService.markRead(n.id).catch(() => {});
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      // Recheck unread count
      fetchCount();
    }
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead().catch(() => {});
    setNotifs(prev => prev.map(x => ({ ...x, isRead: true })));
    setHasUnread(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger-500 ring-2 ring-surface" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] bg-surface rounded-xl border border-border shadow-lg overflow-hidden z-50 animate-fade-in">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <div className="flex items-center gap-1">
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400 font-medium">All caught up!</p>
                <p className="text-xs text-gray-300 mt-1">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map(n => (
                  <li
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={[
                      'flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors',
                      n.isRead ? 'hover:bg-gray-50' : 'bg-primary-50/40 hover:bg-primary-50',
                    ].join(' ')}
                  >
                    <TypeIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.isRead ? 'text-gray-700' : 'font-semibold text-gray-900'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                        {n.body}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">{relTime(n.createdAt)}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5 text-center">
              <span className="text-xs text-gray-400">
                Showing last {notifications.length} notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
