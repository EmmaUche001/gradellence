import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, GraduationCap, Users, School, BookOpen,
  X, ArrowRight, Loader2,
} from 'lucide-react';
import { studentService } from '../../services/studentService';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { subjectService } from '../../services/subjectService';

// ── Result types ─────────────────────────────────────────────────────────────
type Category = 'student' | 'teacher' | 'class' | 'subject';

interface SearchResult {
  id: string;
  category: Category;
  title: string;
  subtitle: string;
  href: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: React.ReactNode; color: string }> = {
  student: { label: 'Students',  icon: <GraduationCap size={14} />, color: 'text-primary-600 bg-primary-50' },
  teacher: { label: 'Teachers',  icon: <Users         size={14} />, color: 'text-success-600 bg-success-50' },
  class:   { label: 'Classes',   icon: <School        size={14} />, color: 'text-warning-600 bg-warning-50' },
  subject: { label: 'Subjects',  icon: <BookOpen      size={14} />, color: 'text-info-600    bg-info-50'    },
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [activeIdx, setActiveIdx]   = useState(-1);

  const debouncedQuery = useDebounce(query.trim(), 300);
  const inputRef  = useRef<HTMLInputElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);

  // ── Keyboard shortcut (⌘K / Ctrl+K) ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [studentsRes, teachersRes, classesRes, subjectsRes] = await Promise.allSettled([
        studentService.getAll(1, 5, q),
        teacherService.getAll(1, 5, q),
        classService.getAll(1, 5, q),
        subjectService.getAll(1, 5, q),
      ]);

      const mapped: SearchResult[] = [];

      if (studentsRes.status === 'fulfilled') {
        for (const s of studentsRes.value.data) {
          mapped.push({
            id: s.id, category: 'student',
            title: `${s.firstName} ${s.lastName}`,
            subtitle: s.admissionNumber,
            href: `/students/${s.id}/edit`,
          });
        }
      }
      if (teachersRes.status === 'fulfilled') {
        for (const t of teachersRes.value.data) {
          mapped.push({
            id: t.id, category: 'teacher',
            title: `${t.firstName} ${t.lastName}`,
            subtitle: t.employeeId + (t.qualification ? ` · ${t.qualification}` : ''),
            href: `/teachers/${t.id}/edit`,
          });
        }
      }
      if (classesRes.status === 'fulfilled') {
        for (const c of classesRes.value.data) {
          mapped.push({
            id: c.id, category: 'class',
            title: c.name,
            subtitle: `Level ${c.level}`,
            href: `/classes/${c.id}/edit`,
          });
        }
      }
      if (subjectsRes.status === 'fulfilled') {
        for (const s of subjectsRes.value.data) {
          mapped.push({
            id: s.id, category: 'subject',
            title: s.name,
            subtitle: s.code + (s.description ? ` · ${s.description}` : ''),
            href: `/subjects/${s.id}/edit`,
          });
        }
      }

      setResults(mapped);
      setActiveIdx(mapped.length > 0 ? 0 : -1);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { runSearch(debouncedQuery); }, [debouncedQuery, runSearch]);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectResult(results[activeIdx]);
    }
  };

  const selectResult = (r: SearchResult) => {
    navigate(r.href);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const close = () => { setOpen(false); setQuery(''); setResults([]); };

  // ── Group results by category ──────────────────────────────────────────────
  const grouped: Partial<Record<Category, SearchResult[]>> = {};
  for (const r of results) {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category]!.push(r);
  }

  const hasResults = results.length > 0;
  const showPanel  = open && (query.length >= 2 || loading);

  return (
    <div className="relative flex-1 max-w-md">
      {/* Search input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search students, teachers, classes…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); if (query.length >= 2) runSearch(query); }}
          onKeyDown={handleKeyDown}
          className="w-full h-10 pl-10 pr-20 text-sm bg-gray-50 border border-border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            placeholder-gray-400 transition-colors"
          aria-label="Global search"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          role="combobox"
        />
        {/* Right side: clear button or keyboard hint */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {query ? (
            <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Clear search">
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 bg-gray-200 rounded px-1.5 py-0.5 font-mono select-none">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Results panel */}
      {showPanel && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 z-40 sm:hidden" onClick={close} />

          <div
            ref={panelRef}
            role="listbox"
            className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-2xl shadow-lg border border-border z-50 overflow-hidden animate-fade-in"
            style={{ maxHeight: '420px', overflowY: 'auto' }}
          >
            {loading && !hasResults ? (
              <div className="flex items-center gap-3 px-4 py-4 text-sm text-gray-400">
                <Loader2 size={16} className="animate-spin" />
                Searching…
              </div>
            ) : !hasResults && debouncedQuery.length >= 2 ? (
              <div className="px-4 py-6 text-center">
                <Search size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No results for <span className="font-medium text-gray-600">"{debouncedQuery}"</span></p>
              </div>
            ) : hasResults ? (
              <div className="py-2">
                {(Object.keys(grouped) as Category[]).map(cat => (
                  <div key={cat}>
                    {/* Category header */}
                    <div className="px-4 py-1.5 flex items-center gap-2">
                      <span className={`flex items-center justify-center w-5 h-5 rounded ${CATEGORY_META[cat].color}`}>
                        {CATEGORY_META[cat].icon}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        {CATEGORY_META[cat].label}
                      </span>
                    </div>

                    {/* Results */}
                    {grouped[cat]!.map((r) => {
                      const globalIdx = results.indexOf(r);
                      const isActive  = globalIdx === activeIdx;
                      return (
                        <button
                          key={r.id}
                          role="option"
                          aria-selected={isActive}
                          onClick={() => selectResult(r)}
                          onMouseEnter={() => setActiveIdx(globalIdx)}
                          className={[
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isActive ? 'bg-primary-50' : 'hover:bg-gray-50',
                          ].join(' ')}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${CATEGORY_META[cat].color}`}>
                            {CATEGORY_META[cat].icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                            <p className="text-xs text-gray-400 truncate">{r.subtitle}</p>
                          </div>
                          {isActive && <ArrowRight size={14} className="text-primary-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <kbd className="bg-gray-100 rounded px-1 py-0.5 font-mono">↑↓</kbd> navigate
                    </span>
                    <span className="flex gap-1">
                      <kbd className="bg-gray-100 rounded px-1 py-0.5 font-mono">↵</kbd> open
                    </span>
                    <span className="flex gap-1">
                      <kbd className="bg-gray-100 rounded px-1 py-0.5 font-mono">esc</kbd> close
                    </span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
