import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import type { SearchableItem, ContentType } from '../../lib/types';
import { normalizePersian, toPersianDigits } from '../../lib/utils';
import { useHydrated } from './useHydrated';

/**
 * Search island.
 *
 * The index is a small prebuilt array shipped as JSON — no index library, no
 * worker, no server. Matching is a scored substring test over normalized text,
 * which handles Persian letter variants and Arabic-Indic digits via the shared
 * `normalizePersian`. A 500-entry course is comfortably fast; a much larger
 * catalog should add a worker rather than a heavier dependency.
 *
 * States covered: idle, loading (index arriving), results, and empty.
 */

export interface SearchIslandProps {
  items: SearchableItem[];
  /** Optional pre-filled query (from the URL). */
  initialQuery?: string;
}

const TYPE_LABELS: Record<ContentType, string> = {
  lesson: 'درس',
  concept: 'مفهوم',
  formula: 'فرمول',
  example: 'مثال',
  question: 'تمرین',
  glossary: 'واژه',
};

interface Scored {
  item: SearchableItem;
  score: number;
}

/**
 * Score one item against the query terms.
 * Exact title prefix > title substring > tag/exact word > body substring.
 */
function score(item: SearchableItem, normalized: SearchableItem & { _norm?: string }, terms: string[]): number {
  const title = normalizePersian(item.title);
  const haystack = normalized._norm ?? normalizePersian(`${item.title} ${item.excerpt ?? ''} ${(item.tags ?? []).join(' ')}`);
  let total = 0;

  for (const term of terms) {
    if (title.startsWith(term)) total += 12;
    else if (title.includes(term)) total += 8;

    if ((item.tags ?? []).some((tag) => normalizePersian(tag).includes(term))) total += 5;

    const wordStart = haystack.includes(` ${term}`);
    if (haystack.includes(term)) total += wordStart ? 4 : 2;
    else return 0; // every term must match somewhere
  }

  return total;
}

export default function SearchIsland({ items, initialQuery = '' }: SearchIslandProps) {
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated('search');

  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, _norm: normalizePersian(`${item.title} ${item.excerpt ?? ''} ${(item.tags ?? []).join(' ')}`) })),
    [items],
  );

  const results = useMemo<Scored[]>(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) return [];

    const terms = normalizePersian(trimmed).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    return normalizedItems
      .map((item) => ({ item, score: score(item, item, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'fa'))
      .slice(0, 40);
  }, [deferredQuery, normalizedItems]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    // Keep the URL shareable without adding a history entry per keystroke.
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set('q', value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  }, []);

  const hasQuery = deferredQuery.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl" data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          جست‌وجو در دوره
        </label>
        <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-4 text-ink-faint">
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" />
          </svg>
        </div>
        <input
          id="search-input"
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="جست‌وجو در مفاهیم، فرمول‌ها و درس‌ها…"
          autoComplete="off"
          className="h-14 w-full rounded-pill border border-line-control bg-surface ps-12 pe-12 text-base text-ink placeholder:text-ink-faint focus:border-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              handleChange('');
              inputRef.current?.focus();
            }}
            aria-label="پاک کردن جست‌وجو"
            className="absolute inset-y-0 end-0 flex items-center px-4 text-ink-faint transition-colors hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
            </svg>
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-faint" aria-live="polite">
        {hasQuery
          ? results.length > 0
            ? `${toPersianDigits(results.length)} نتیجه`
            : 'نتیجه‌ای یافت نشد'
          : 'حداقل ۲ نویسه بنویسید تا جست‌وجو آغاز شود.'}
      </p>

      {/* Results */}
      {hasQuery && results.length > 0 && (
        <ul className="mt-4 grid gap-2">
          {results.map(({ item }) => (
            <li key={`${item.type}-${item.slug}`}>
              <a
                href={item.href}
                className="group flex flex-col rounded-lg border border-line bg-surface px-5 py-4 transition-colors duration-fast hover:border-primary hover:bg-primary-wash/40"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-pill bg-surface-sunken px-2 py-0.5 text-2xs font-bold text-ink-muted">
                    {TYPE_LABELS[item.type]}
                  </span>
                  <h2 className="font-display text-base font-bold text-ink group-hover:text-primary-deep">{item.title}</h2>
                </div>
                {item.excerpt && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{item.excerpt}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* Empty state: explain what to try, not just "no results". */}
      {hasQuery && results.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-line-control bg-surface px-6 py-10 text-center">
          <svg
            width="30"
            height="30"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            className="mx-auto text-ink-faint"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.5 13.5 3.5 3.5" />
          </svg>
          <p className="mt-3 font-display text-base font-bold text-ink">نتیجه‌ای برای «{deferredQuery.trim()}» پیدا نشد</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            املای واژه را بررسی کنید یا با نام یک مفهوم، فرمول یا بخش دوره جست‌وجو کنید.
          </p>
        </div>
      )}

      {/* Idle state: what is searchable. */}
      {!hasQuery && (
        <div className="mt-4 rounded-lg border border-line bg-surface px-5 py-5">
          <p className="text-xs font-bold tracking-wide text-ink-faint">می‌توانید جست‌وجو کنید</p>
          <ul className="mt-2 grid gap-1.5 text-sm text-ink-muted">
            <li>نام یک مفهوم، مثل «مشتق»</li>
            <li>نام یک فرمول، مثل «زنجیره»</li>
            <li>عنوان یک درس یا مثال حل‌شده</li>
          </ul>
        </div>
      )}
    </div>
  );
}