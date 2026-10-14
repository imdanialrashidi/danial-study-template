import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import type { SearchableItem } from '../../lib/types';
import { SINGULAR_LABELS as TYPE_LABELS } from '../../lib/types';
import { normalizePersian, toPersianDigits } from '../../lib/utils';
import { normalizeIndexEntry, scoreSearchItem } from '../../lib/search';
import { useHydrated } from './useHydrated';
import { readSiteSearchIndex } from './searchIndex';
import IslandIcon from './IslandIcon';

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
  /**
   * Server-render fallback only. The client reads the single shared
   * `#site-search-index` payload the layout serializes once per page, so the
   * index is never serialized as island props. Passing items here is only
   * useful for pre-rendering `?q=` results; omit it (as `search.astro` does)
   * and hydration fills results from the shared payload on mount.
   */
  items?: SearchableItem[];
  /** Optional pre-filled query (from the URL). */
  initialQuery?: string;
}

interface Scored {
  item: SearchableItem;
  score: number;
}

export default function SearchIsland({ items: ssrItems = [], initialQuery = '' }: SearchIslandProps) {
  // Client source of truth: the shared payload. The prop only feeds SSR.
  const sharedItems = useMemo(() => readSiteSearchIndex(ssrItems), [ssrItems]);
  const items = typeof document === 'undefined' ? ssrItems : sharedItems;
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const hydrated = useHydrated('search');

  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, _norm: normalizeIndexEntry(item) })),
    [items],
  );

  const results = useMemo<Scored[]>(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) return [];

    const terms = normalizePersian(trimmed).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];

    return normalizedItems
      .map((item) => ({ item, score: scoreSearchItem(item, item, terms) }))
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
          <IslandIcon name="search" size={19} />
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
            <IslandIcon name="close" size={18} />
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
          <IslandIcon name="search" size={30} className="mx-auto text-ink-faint" />
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