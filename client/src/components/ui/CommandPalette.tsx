import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, GraduationCap, Users, School,
  BookOpen, CalendarDays, ClipboardCheck, ScrollText, Layers,
  UserCheck, BarChart3, BookMarked, Megaphone, CreditCard,
  Settings, Plus, Upload, BarChart2, FileText, Shield,
  ChevronRight, Command,
} from 'lucide-react';
import gsap from 'gsap';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  path: string;
  keywords: string[];
  group: string;
}

const COMMANDS: CommandItem[] = [
  // Navigation
  { id: 'dashboard',          label: 'Dashboard',              icon: <LayoutDashboard size={16} />, path: '/dashboard',             keywords: ['home', 'overview'],                group: 'Navigate' },
  { id: 'students',           label: 'Students',               icon: <GraduationCap   size={16} />, path: '/students',              keywords: ['pupil', 'learner'],                 group: 'Navigate' },
  { id: 'teachers',           label: 'Teachers',               icon: <Users           size={16} />, path: '/teachers',              keywords: ['staff', 'tutor'],                   group: 'Navigate' },
  { id: 'classes',            label: 'Classes',                icon: <School          size={16} />, path: '/classes',               keywords: ['class', 'room'],                    group: 'Navigate' },
  { id: 'subjects',           label: 'Subjects',               icon: <BookOpen        size={16} />, path: '/subjects',              keywords: ['course', 'topic'],                  group: 'Navigate' },
  { id: 'sessions',           label: 'Sessions & Terms',       icon: <CalendarDays    size={16} />, path: '/sessions',              keywords: ['term', 'semester', 'year'],         group: 'Navigate' },
  { id: 'enrollments',        label: 'Enrollments',            icon: <UserCheck       size={16} />, path: '/enrollments',           keywords: ['enrol', 'register'],                group: 'Navigate' },
  { id: 'assessments',        label: 'Assessments',            icon: <ClipboardCheck  size={16} />, path: '/assessments',           keywords: ['scores', 'marks', 'ca', 'exam'],    group: 'Navigate' },
  { id: 'results',            label: 'Results',                icon: <ScrollText      size={16} />, path: '/results',               keywords: ['result', 'grade', 'report'],        group: 'Navigate' },
  { id: 'broadsheet',         label: 'Broadsheet',             icon: <BarChart2       size={16} />, path: '/results/broadsheet',    keywords: ['broadsheet', 'compute', 'publish'], group: 'Navigate' },
  { id: 'grade-scales',       label: 'Grade Scales',           icon: <Layers          size={16} />, path: '/grade-scales',          keywords: ['grading', 'scale', 'gpa'],          group: 'Navigate' },
  { id: 'analytics',          label: 'Analytics',              icon: <BarChart3       size={16} />, path: '/analytics',             keywords: ['stats', 'performance', 'chart'],    group: 'Navigate' },
  { id: 'announcements',      label: 'Announcements',          icon: <Megaphone       size={16} />, path: '/announcements',         keywords: ['notice', 'news'],                   group: 'Navigate' },
  { id: 'audit-logs',         label: 'Audit Logs',             icon: <BookMarked      size={16} />, path: '/audit-logs',            keywords: ['log', 'activity', 'history'],       group: 'Navigate' },
  { id: 'users',              label: 'Staff Users',            icon: <Users           size={16} />, path: '/users',                 keywords: ['user', 'account', 'staff'],         group: 'Navigate' },
  { id: 'roles',              label: 'Roles',                  icon: <Shield          size={16} />, path: '/roles',                 keywords: ['role', 'permission', 'access'],     group: 'Navigate' },
  { id: 'billing',            label: 'Billing',                icon: <CreditCard      size={16} />, path: '/billing',               keywords: ['invoice', 'payment'],               group: 'Navigate' },
  { id: 'settings',           label: 'School Settings',        icon: <Settings        size={16} />, path: '/settings',              keywords: ['config', 'profile', 'school'],      group: 'Navigate' },
  // Quick actions
  { id: 'new-student',        label: 'Add Student',            icon: <Plus            size={16} />, path: '/students/new',          keywords: ['create', 'add', 'new', 'student'],  group: 'Actions'  },
  { id: 'import-students',    label: 'Import Students (CSV)',  icon: <Upload          size={16} />, path: '/students/import',       keywords: ['bulk', 'import', 'csv', 'upload'],  group: 'Actions'  },
  { id: 'new-teacher',        label: 'Add Teacher',            icon: <Plus            size={16} />, path: '/teachers/new',          keywords: ['create', 'add', 'new', 'teacher'],  group: 'Actions'  },
  { id: 'new-class',          label: 'Add Class',              icon: <Plus            size={16} />, path: '/classes/new',           keywords: ['create', 'add', 'new', 'class'],    group: 'Actions'  },
  { id: 'new-subject',        label: 'Add Subject',            icon: <Plus            size={16} />, path: '/subjects/new',          keywords: ['create', 'add', 'new', 'subject'],  group: 'Actions'  },
  { id: 'new-assessment',     label: 'Record Assessment',      icon: <FileText        size={16} />, path: '/assessments/new',       keywords: ['score', 'mark', 'record', 'ca'],    group: 'Actions'  },
  { id: 'score-entry',        label: 'Bulk Score Entry',       icon: <ClipboardCheck  size={16} />, path: '/assessments/score-entry', keywords: ['bulk', 'class', 'entry', 'grid'], group: 'Actions'  },
  { id: 'import-scores',      label: 'Import Scores (CSV)',    icon: <Upload          size={16} />, path: '/assessments/import',    keywords: ['bulk', 'import', 'scores', 'csv'],  group: 'Actions'  },
  { id: 'enroll-student',     label: 'Enroll Student',         icon: <Plus            size={16} />, path: '/enrollments/new',       keywords: ['enrol', 'new', 'add'],              group: 'Actions'  },
  { id: 'bulk-enroll',        label: 'Bulk Enroll Students',   icon: <Upload          size={16} />, path: '/enrollments/bulk',      keywords: ['bulk', 'enrol', 'many'],            group: 'Actions'  },
];

function scoreMatch(item: CommandItem, query: string): number {
  const q = query.toLowerCase();
  if (item.label.toLowerCase().startsWith(q)) return 3;
  if (item.label.toLowerCase().includes(q)) return 2;
  if (item.keywords.some(k => k.includes(q))) return 1;
  if (item.description?.toLowerCase().includes(q)) return 0.5;
  return 0;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate           = useNavigate();
  const [query, setQuery]  = useState('');
  const [activeIdx, setActive] = useState(0);
  const overlayRef         = useRef<HTMLDivElement>(null);
  const panelRef           = useRef<HTMLDivElement>(null);
  const inputRef           = useRef<HTMLInputElement>(null);
  const listRef            = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? COMMANDS.map(c => ({ cmd: c, score: scoreMatch(c, query) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.cmd)
    : COMMANDS;

  // Group filtered results
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c); return acc;
  }, {});

  // Flat list for keyboard nav
  const flat = Object.values(groups).flat();

  // Snap open/close immediately (no animation for high-frequency action)
  useEffect(() => {
    if (!panelRef.current || !overlayRef.current) return;
    if (open) {
      setQuery('');
      setActive(0);
      // Ensure initial opacity is 0, then snap to visible
      gsap.set([overlayRef.current, panelRef.current], { opacity: 0 });
      // Use a 0-duration tween to snap visible (bypasses any timing issues)
      gsap.to(overlayRef.current, { opacity: 1, duration: 0 });
      gsap.to(panelRef.current, { opacity: 1, scale: 1, y: 0, duration: 0 });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const close = useCallback(() => {
    if (!panelRef.current || !overlayRef.current) { onClose(); return; }
    // Snap closed instantly
    gsap.set(panelRef.current, { opacity: 0 });
    gsap.set(overlayRef.current, { opacity: 0 });
    onClose();
  }, [onClose]);

  const run = (item: CommandItem) => {
    close();
    setTimeout(() => navigate(`/dashboard/${item.path.replace(/^\//, '')}`), 160);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); if (flat[activeIdx]) run(flat[activeIdx]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, flat, activeIdx, close]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset active on query change
  useEffect(() => { setActive(0); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={close}
        style={{ opacity: 0 }}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-[580px] bg-surface rounded-2xl shadow-2xl overflow-hidden border border-border"
        style={{ opacity: 0 }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions, settings…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-gray-400 bg-gray-100 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
          {flat.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              No results for "<span className="font-medium text-gray-600">{query}</span>"
            </div>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {group}
                </p>
                {items.map(item => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive}
                      onClick={() => run(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75',
                        isActive ? 'bg-primary-50' : 'hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span className={`shrink-0 p-1.5 rounded-lg transition-colors ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary-700' : 'text-gray-800'}`}>
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-400 truncate">{item.description}</p>
                        )}
                      </div>
                      {isActive && <ChevronRight size={14} className="text-primary-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-gray-50/50">
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[9px]">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 font-mono text-[9px]">↵</kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-300">
            <Command size={10} /> K
          </span>
        </div>
      </div>
    </div>
  );
}
