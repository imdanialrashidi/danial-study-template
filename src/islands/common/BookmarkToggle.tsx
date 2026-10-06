import { useEffect, useState } from 'react';
import { ProgressBridge } from './ProgressBridge';
import { useHydrated } from './useHydrated';

export interface BookmarkToggleProps {
  /** Content id, e.g. the lesson slug. */
  id: string;
  label?: string;
}

/**
 * Bookmark a page for later review.
 *
 * Rendered near the page title so "I'll come back to this" is available
 * immediately while reading. The completion mark lives at the end of the page
 * instead, where it acts as a finishing gesture rather than a distraction.
 */
export default function BookmarkToggle({ id, label = 'این صفحه' }: BookmarkToggleProps) {
  const [saved, setSaved] = useState(false);
  const hydrated = useHydrated('bookmark');

  useEffect(() => {
    setSaved(ProgressBridge.isBookmarked(id));
  }, [id]);

  return (
    <button
      type="button"
      onClick={() => setSaved(ProgressBridge.toggleBookmarked(id))}
      aria-pressed={saved}
      aria-label={saved ? `حذف ${label} از نشان‌شده‌ها` : `افزودن ${label} به نشان‌شده‌ها`}
      title={saved ? 'حذف از نشان‌شده‌ها' : 'نشان کردن برای بعد'}
      data-hydrated={hydrated ? 'true' : 'false'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors duration-fast ${
        saved
          ? 'border-accent/40 bg-accent-wash text-accent-deep'
          : 'border-line bg-surface text-ink-muted hover:border-line-control hover:text-ink'
      }`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M5.5 3.5h9a1 1 0 0 1 1 1v12l-5.5-3.5-5.5 3.5v-12a1 1 0 0 1 1-1z" />
      </svg>
    </button>
  );
}