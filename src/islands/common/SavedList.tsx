import { useEffect, useState } from 'react';
import { resolveSavedRows } from '../../lib/resolve';
import { ProgressBridge, subscribeProgress } from './ProgressBridge';
import { useHydrated } from './useHydrated';
import IslandIcon from './IslandIcon';
import { withBase } from '../../lib/url';
import { toPersianDigits } from '../../lib/utils';
import { PLURAL_LABELS, SINGULAR_LABELS } from '../../lib/types';
import type { ContentType } from '../../lib/types';

/**
 * A bookmark-resolvable entry, projected server-side to JSON-safe fields.
 *
 * The island receives these pre-resolved (links already through `withBase`,
 * mirroring the search index) so the client bundle never touches routing.
 */
export interface SavedEntry {
  id: string;
  qualifiedId: string;
  title: string;
  href: string;
  kind: ContentType;
  section?: string;
}

export interface SavedSection {
  id: string;
  title: string;
}

export interface SavedListProps {
  entries: SavedEntry[];
  sections: SavedSection[];
}

export interface SavedRow {
  /** The exact stored bookmark id (bare or qualified) — used for removal. */
  bookmark: string;
  entry: SavedEntry;
}

/**
 * Bookmark identity resolves through the shared resolver (`src/lib/resolve`):
 * a stored id matches the qualified `<kind>/<slug>` identity or a unique
 * bare slug, and anything ambiguous or stale is pruned by `resolveSavedRows`
 * rather than linking wrongly.
 */

interface SavedGroup {
  title: string;
  rows: SavedRow[];
}

/**
 * Saved reading list.
 *
 * Ports the `CourseProgress` client-filter pattern: the server renders a
 * static empty shell (so no-JS readers see something meaningful), and the
 * island fills in the stored bookmarks after mount, re-reading on
 * `dr-progress`/`storage`. Glossary saves trail in their own group.
 */
export default function SavedList({ entries, sections }: SavedListProps) {
  const hydrated = useHydrated('saved');
  const [rows, setRows] = useState<SavedRow[] | null>(null);
  const [persistent, setPersistent] = useState(true);

  useEffect(() => {
    const read = () => {
      setRows(resolveSavedRows(ProgressBridge.snapshot().bookmarks, entries));
      setPersistent(ProgressBridge.persistent);
    };
    read();
    return subscribeProgress(read);
  }, [entries]);

  const groups: SavedGroup[] = [];
  if (rows && rows.length > 0) {
    const bySection = new Map<string, SavedRow[]>();
    const glossaryRows: SavedRow[] = [];
    for (const row of rows) {
      if (row.entry.kind === 'glossary') {
        glossaryRows.push(row);
        continue;
      }
      const key = row.entry.section ?? '';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key)!.push(row);
    }
    const titles = new Map(sections.map((s) => [s.id, s.title]));
    for (const section of sections) {
      const sectionRows = bySection.get(section.id);
      if (sectionRows && sectionRows.length > 0) {
        groups.push({ title: section.title, rows: sectionRows });
        bySection.delete(section.id);
      }
    }
    for (const [key, leftover] of bySection) {
      groups.push({ title: titles.get(key) ?? key ?? 'نشان‌شده‌ها', rows: leftover });
    }
    if (glossaryRows.length > 0) {
      groups.push({ title: PLURAL_LABELS.glossary, rows: glossaryRows });
    }
  }

  return (
    <div data-hydrated={hydrated ? 'true' : 'false'}>
      {!persistent && (
        <p className="mb-4 rounded-lg border border-line bg-surface-sunken px-4 py-3 text-sm text-ink-muted">
          نشان‌کردن در این مرورگر ذخیره نمی‌شود.
        </p>
      )}
      {groups.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="flex items-center justify-center gap-2 text-lg font-bold text-ink">
            <IslandIcon name="bookmark" size={20} />
            هنوز چیزی را نشان نکرده‌اید
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
            هر صفحه‌ای را که بخواهید بعداً بخوانید نشان کنید؛ فهرست شما همین‌جا می‌ماند.
          </p>
          <a
            href={withBase('/lessons')}
            className="mt-5 inline-flex min-h-[44px] items-center rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-on transition-colors hover:bg-primary-deep"
          >
            رفتن به فهرست درس‌ها
          </a>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.title} aria-label={group.title} className="mb-8">
            <h2 className="mb-3 text-sm font-bold text-ink">
              {group.title}
              <span className="ms-2 text-xs font-medium text-ink-faint">{toPersianDigits(group.rows.length)}</span>
            </h2>
            <ul className="grid gap-1.5 rounded-lg border border-line bg-surface p-3">
              {group.rows.map(({ bookmark, entry }) => (
                <li key={entry.qualifiedId}>
                  <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-primary-wash/50">
                    <a
                      href={entry.href}
                      data-astro-prefetch
                      className="flex min-h-[44px] min-w-0 flex-1 items-baseline gap-1 text-sm leading-relaxed"
                    >
                      <span className="truncate font-medium text-ink group-hover:text-primary-deep">{entry.title}</span>
                      <span className="mx-1 flex-1 border-b border-dotted border-line-control" aria-hidden="true" />
                      <span className="shrink-0 text-2xs text-ink-faint">{SINGULAR_LABELS[entry.kind]}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => ProgressBridge.toggleBookmarked(bookmark)}
                      aria-label={`حذف ${entry.title} از نشان‌شده‌ها`}
                      title="حذف از نشان‌شده‌ها"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/40 bg-accent-wash text-accent-deep transition-colors hover:border-danger/50 hover:text-danger"
                    >
                      <IslandIcon name="bookmark" size={16} fill="currentColor" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
