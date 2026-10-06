import { useEffect, useState } from 'react';
import { ProgressBridge } from './ProgressBridge';
import { toPersianDigits } from '../../lib/utils';
import { useHydrated } from './useHydrated';

export interface CourseProgressProps {
  /** Every trackable content id in the course. */
  entryIds: string[];
}

/**
 * Course progress readout.
 *
 * Reads the same local store the lesson toggle writes to, so a learner can see
 * how far they have come. Renders an empty/zero state on the server and fills
 * in after mount.
 */
export default function CourseProgress({ entryIds }: CourseProgressProps) {
  const hydrated = useHydrated('courseProgress');
  const [state, setState] = useState({ done: 0, total: entryIds.length, percent: 0, persistent: true });

  useEffect(() => {
    const read = () => {
      const ratio = ProgressBridge.completionRatio(entryIds);
      setState({ ...ratio, persistent: ProgressBridge.persistent });
    };
    read();

    // Re-read when another island on the page (e.g. a lesson toggle) writes.
    const onStorage = () => read();
    window.addEventListener('storage', onStorage);
    window.addEventListener('dr-progress', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('dr-progress', onStorage);
    };
  }, [entryIds]);

  const { done, total, percent, persistent } = state;

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5"
      data-hydrated={hydrated ? 'true' : 'false'}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-wash text-primary-deep" aria-hidden="true">
          <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 10.5 4 4 8-9" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-bold text-ink">
            {percent === 0 ? 'هنوز مطلبی را تمام نکرده‌اید' : `${toPersianDigits(percent)}٪ از دوره کامل شده`}
          </p>
          <p className="text-xs text-ink-muted">
            {toPersianDigits(done)} از {toPersianDigits(total)} مطلب
          </p>
        </div>
      </div>

      <div className="sm:ms-auto sm:w-56">
        <div
          className="h-2 w-full overflow-hidden rounded-pill bg-surface-sunken"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="پیشرفت دوره"
        >
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-base ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        {!persistent && <p className="mt-1.5 text-2xs text-ink-faint">پیشرفت در این مرورگر ذخیره نمی‌شود.</p>}
      </div>
    </div>
  );
}