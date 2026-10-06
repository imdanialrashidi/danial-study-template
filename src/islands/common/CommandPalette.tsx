import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SearchableItem, ContentType } from '../../lib/types';
import { normalizePersian, toPersianDigits } from '../../lib/utils';
import { focusFirst, trapFocus } from '../../lib/a11y';

/**
 * Command palette — `Cmd/Ctrl + K` fast navigation over the same build-time
 * index the search page uses. Lightweight by design: no library, one dialog,
 * substring scoring, first 8 hits.
 *
 * Accessibility: `role="dialog"` + `aria-modal`, Esc closes, arrows move,
 * Enter visits, focus returns to the trigger. Any element with
 * `data-open-palette` also opens it (used by the search page hint).
 */

export interface CommandPaletteProps {
  items: SearchableItem[];
}

const TYPE_LABELS: Record<ContentType, string> = {
  lesson: 'درس',
  concept: 'مفهوم',
  formula: 'فرمول',
  example: 'مثال',
  question: 'تمرین',
  glossary: 'واژه',
};

export default function CommandPalette({ items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    if (triggerRef.current && document.contains(triggerRef.current)) {
      triggerRef.current.focus();
    }
  }, []);

  const results = useMemo(() => {
    const terms = normalizePersian(query).split(/\s+/).filter(Boolean);
    const pool = terms.length === 0 ? items.slice(0, 8) : items;
    const scored = pool
      .map((item) => {
        if (terms.length === 0) return { item, score: 1 };
        const hay = normalizePersian(`${item.title} ${item.excerpt ?? ''} ${(item.tags ?? []).join(' ')}`);
        let score = 0;
        for (const term of terms) {
          if (normalizePersian(item.title).startsWith(term)) score += 10;
          else if (normalizePersian(item.title).includes(term)) score += 6;
          else if (hay.includes(term)) score += 2;
          else return { item, score: 0 };
        }
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'fa'));
    return scored.slice(0, 8).map((r) => r.item);
  }, [items, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Global shortcut + declarative triggers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        triggerRef.current = document.activeElement as HTMLElement | null;
        setOpen((v) => !v);
      }
      if (e.key === 'Escape' && open) close();
    }
    function onTriggerClick(e: Event) {
      const el = (e.target as HTMLElement).closest('[data-open-palette]');
      if (!el) return;
      e.preventDefault();
      triggerRef.current = el as HTMLElement;
      setOpen(true);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onTriggerClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onTriggerClick);
    };
  }, [open, close]);

  // Focus containment while open.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const release = trapFocus(dialog);
    focusFirst(dialog);
    document.body.style.overflow = 'hidden';
    return () => {
      release();
      document.body.style.overflow = '';
    };
  }, [open ]);

  useEffect(() => {
    document.documentElement.dataset.paletteHydrated = 'true';
  }, []);

  if (!open) return null;

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="پالت فرمان — جست‌وجوی سریع" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={close} aria-hidden="true" />
      <div className="relative mx-auto mt-[12vh] w-[min(92vw,36rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-float">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 text-ink-faint" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" />
          </svg>
          <label htmlFor="palette-input" className="sr-only">جست‌وجوی سریع در دوره</label>
          <input
            id="palette-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter' && results[active]) {
                window.location.href = results[active].href;
              }
            }}
            placeholder="نام درس، مفهوم یا فرمول…"
            autoComplete="off"
            className="h-13 min-h-[52px] w-full bg-transparent py-3 text-[15px] text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="hidden shrink-0 rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] text-ink-faint sm:block" dir="ltr">esc</kbd>
        </div>
        {results.length > 0 ? (
          <ul className="max-h-[50vh] overflow-auto p-2" role="listbox" aria-label="نتایج">
            {results.map((item, i) => (
              <li key={`${item.type}-${item.slug}`} role="option" aria-selected={i === active}>
                <a
                  href={item.href}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  className={`flex min-h-[48px] items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    i === active ? 'bg-primary-wash text-ink' : 'text-ink-muted'
                  }`}
                >
                  <span className="shrink-0 rounded-pill bg-surface-sunken px-2 py-0.5 text-2xs font-bold text-ink-muted">
                    {TYPE_LABELS[item.type]}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.title}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">
            نتیجه‌ای یافت نشد — عبارت دیگری را امتحان کنید.
          </p>
        )}
        <p className="border-t border-line px-4 py-2 text-2xs text-ink-faint">
          {toPersianDigits(results.length)} نتیجه · جهت‌نما برای حرکت، Enter برای رفتن
        </p>
      </div>
    </div>
  );
}
