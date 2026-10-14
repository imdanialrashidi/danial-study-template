import { useEffect, useState } from 'react';
import { ProgressBridge } from './ProgressBridge';
import { useHydrated } from './useHydrated';
import IslandIcon from './IslandIcon';

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
    const sync = () => setSaved(ProgressBridge.isBookmarked(id));
    sync();
    window.addEventListener('dr-progress', sync);
    const onStorage = () => {
      ProgressBridge.refresh();
      sync();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('dr-progress', sync);
      window.removeEventListener('storage', onStorage);
    };
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
      <IslandIcon name="bookmark" size={16} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}