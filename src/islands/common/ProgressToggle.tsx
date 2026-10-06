import { useEffect, useState } from 'react';
import { ProgressBridge } from './ProgressBridge';
import { useHydrated } from './useHydrated';

export interface ProgressToggleProps {
  /** Content id, e.g. the lesson slug. */
  id: string;
  label?: string;
  /** Action label before the item is marked done. */
  doneLabel?: string;
  undoneLabel?: string;
}

/**
 * Marks a lesson/concept/formula as done, or bookmarked for later.
 *
 * The initial state is read after mount so the server-rendered HTML matches
 * the "not yet done" default and hydration never mismatches.
 *
 * Rendered at the end of the body, where it acts as a completion gesture.
 * Bookmarking lives beside the page title instead, so the two actions are not
 * duplicated inside one control.
 */
export default function ProgressToggle({
  id,
  label = 'این مطلب',
  doneLabel = 'انجام شد',
  undoneLabel = 'تمام کردم',
}: ProgressToggleProps) {
  const [done, setDone] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [ready, setReady] = useState(false);

  const hydrated = useHydrated('progress');

  useEffect(() => {
    setDone(ProgressBridge.isCompleted(id));
    setPersistent(ProgressBridge.persistent);
    setReady(true);
  }, [id]);

  const labelId = `${id}-progress-label`;

  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <span id={labelId} className="sr-only">
        وضعیت پیشرفت برای {label}
      </span>
      <button
        type="button"
        onClick={() => setDone(ProgressBridge.toggleCompleted(id))}
        aria-pressed={done}
        aria-describedby={labelId}
        data-hydrated={hydrated ? 'true' : 'false'}
        className={`inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors duration-fast ${
          done
            ? 'bg-success-soft text-success'
            : 'border border-line-control bg-surface text-ink hover:bg-surface-sunken'
        }`}
      >
        {done ? <CheckIcon /> : <CircleIcon />}
        {done ? doneLabel : undoneLabel}
      </button>

      {ready && !persistent && (
        <span className="text-2xs text-ink-faint" role="status">
          در این مرورگر ذخیره نمی‌شود
        </span>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="m4 10.5 4 4 8-9" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="10" cy="10" r="7.5" />
    </svg>
  );
}