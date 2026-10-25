import { useEffect, useMemo, useRef, useState } from 'react';
import { SINGULAR_LABELS as TYPE_LABELS } from '../../lib/types';
import type { SearchableItem } from '../../lib/types';
import { toPersianDigits } from '../../lib/utils';
import { normalizeIndexEntry, rankSearchItems } from '../../lib/search';
import { focusFirst, trapFocus } from '../../lib/a11y';
import IslandIcon from './IslandIcon';
import { readSiteSearchIndex } from './searchIndex';

/**
 * Command palette dialog — the scoring + rendering half of the palette.
 *
 * Lazy-loaded on first `Ctrl/⌘+K` by the `CommandPalette` trigger island, so
 * the scorer, normalized index, and dialog markup never hydrate until needed.
 * Scoring logic is unchanged from the pre-split island (shared scorer +
 * title-tiebreak, first 8 hits); only the mounting moved.
 */

export interface CommandPaletteDialogProps {
  /** Element that opened the palette; focus returns here on close. */
  trigger: HTMLElement | null;
  onClose: () => void;
}

export default function CommandPaletteDialog({ trigger, onClose }: CommandPaletteDialogProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const items: SearchableItem[] = useMemo(() => readSiteSearchIndex(), []);

  const close = () => {
    onClose();
    if (trigger && document.contains(trigger)) {
      trigger.focus();
    }
  };

  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, _norm: normalizeIndexEntry(item) })),
    [items],
  );

  const results = useMemo(
    () => rankSearchItems(normalizedItems, query, { limit: 8, emptyFill: 8 }).map((r) => r.item),
    [normalizedItems, query],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Esc closes once mounted; the trigger island owns the global shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus containment while open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const release = trapFocus(dialog);
    focusFirst(dialog);
    document.body.style.overflow = 'hidden';
    return () => {
      release();
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="پالت فرمان — جست‌وجوی سریع" className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={close} aria-hidden="true" />
      <div className="relative mx-auto mt-[12vh] w-[min(92vw,36rem)] overflow-hidden rounded-lg border border-line bg-surface shadow-float">
        <div className="flex items-center gap-2 border-b border-line px-4">
          <IslandIcon name="search" size={17} className="shrink-0 text-ink-faint" />
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
