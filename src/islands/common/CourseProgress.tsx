import { useEffect, useMemo, useState } from 'react';
import { ProgressBridge, subscribeProgress } from './ProgressBridge';
import { toPersianDigits } from '../../lib/utils';
import { useHydrated } from './useHydrated';
import IslandIcon from './IslandIcon';

/** One readable entry in course order, resolved to a link at build time. */
export interface ProgressEntry {
  id: string;
  title: string;
  href: string;
}

export interface CourseProgressProps {
  /** Every trackable entry, in the order the course is meant to be read. */
  entries: ProgressEntry[];
}

interface ProgressState {
  done: number;
  total: number;
  percent: number;
  persistent: boolean;
}

/**
 * Course progress + resume.
 *
 * The previous version reported a percentage and nothing else: a learner with
 * three of seven done still had to rebuild their place from the contents index.
 * This one names the next unread entry and links straight to it, so returning
 * to the course takes one tap.
 *
 * The server renders the honest zero state (nothing read yet, first entry as
 * the target), then the island re-reads localStorage and the shared
 * `dr-progress` event keeps it in sync with the toggles on content pages.
 */
export default function CourseProgress({ entries }: CourseProgressProps) {
  const hydrated = useHydrated('courseProgress');
  const [state, setState] = useState<ProgressState>({
    done: 0,
    total: entries.length,
    percent: 0,
    persistent: true,
  });
  const [completed, setCompleted] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    const read = () => {
      const ratio = ProgressBridge.completionRatio(entries.map((entry) => entry.id));
      setState({ ...ratio, persistent: ProgressBridge.persistent });
      setCompleted(new Set(ProgressBridge.snapshot().completed));
    };
    read();
    return subscribeProgress(read);
  }, [entries]);

  const { done, total, percent, persistent } = state;
  const allDone = total > 0 && done === total;
  const next = useMemo(
    () => entries.find((entry) => !completed.has(entry.id)) ?? null,
    [completed, entries],
  );
  const target = next ?? entries[0] ?? null;

  if (!target) return null;

  const actionLabel = allDone ? 'مرور از ابتدا' : percent === 0 ? 'شروع از ابتدا' : 'ادامهٔ یادگیری';
  const status =
    percent === 0
      ? 'هنوز شروع نکرده‌اید'
      : allDone
        ? 'همهٔ مطالب را خوانده‌اید'
        : `${toPersianDigits(percent)}٪ از دوره کامل شده`;

  return (
    <div className="flex flex-col gap-3" data-hydrated={hydrated ? 'true' : 'false'}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-2xs font-bold tracking-wide text-ink-faint">پیشرفت شما</span>
            <span className="text-sm font-bold text-ink">{status}</span>
          </p>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {allDone ? 'می‌توانید از هر جای دوره مرور را شروع کنید.' : <>بعدی: <span className="font-bold text-ink">{target.title}</span></>}
          </p>
        </div>

        <a
          href={target.href}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-line-control bg-surface px-4 py-2 text-sm font-bold text-ink transition-colors duration-fast hover:border-primary hover:bg-primary-wash hover:text-primary-deep"
        >
          {actionLabel}
          <IslandIcon name="chevron-end" size={16} />
        </a>
      </div>

      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface-sunken"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${toPersianDigits(done)} از ${toPersianDigits(total)} مطلب`}
          aria-label="پیشرفت دوره"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-base ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-ink-muted">
          {toPersianDigits(done)} از {toPersianDigits(total)}
        </span>
      </div>

      {!persistent && (
        <p className="text-2xs text-ink-faint" role="status">
          پیشرفت در این مرورگر ذخیره نمی‌شود؛ این صفحه فقط برای همین بازدید به یاد می‌ماند.
        </p>
      )}
    </div>
  );
}
