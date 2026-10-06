import { useCallback, useEffect, useId, useState } from 'react';

/**
 * A single revealable step.
 *
 * `html` carries **pre-rendered** KaTeX markup produced at build time, so the
 * island never ships a math renderer and never handles raw TeX.
 */
export interface Step {
  /** Optional short heading, e.g. "گام ۱: تعریف مسئله". */
  title?: string;
  /** Plain text. Rendered as text, never as raw HTML. */
  content?: string;
  /** Server-rendered math HTML for this step. */
  html?: string;
}

export interface StepRevealProps {
  steps: Step[];
  /** Heading shown above the reveal. */
  title?: string;
  /** 'manual' reveals one step per click; 'all' reveals everything at once. */
  mode?: 'manual' | 'all';
}

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersian(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

export default function StepReveal({ steps, title, mode = 'manual' }: StepRevealProps) {
  const uid = useId().replace(/:/g, '');
  const [revealed, setRevealed] = useState<number>(mode === 'all' ? steps.length : 0);

  // Marks the island as hydrated so visual QA can detect an island that was
  // server-rendered without a client directive and would never respond.
  useEffect(() => {
    document.documentElement.dataset.stepRevealHydrated = 'true';
  }, []);

  const revealNext = useCallback(() => {
    setRevealed((current) => Math.min(current + 1, steps.length));
  }, [steps.length]);

  const revealAll = useCallback(() => setRevealed(steps.length), [steps.length]);

  const reset = useCallback(() => setRevealed(0), []);

  const visible = steps.slice(0, revealed);
  const remaining = steps.length - revealed;

  return (
    <section className="overflow-hidden" aria-label={title ?? 'گام‌های حل'}>
      {title && (
        <header className="flex items-center gap-2 border-b border-line px-5 py-3">
          <svg
            width="17"
            height="17"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-deep"
            aria-hidden="true"
          >
            <path d="m4 10.5 4 4 8-9" />
          </svg>
          <h3 className="text-xs font-bold tracking-wide text-ink-muted">{title}</h3>
        </header>
      )}

      <ol className="divide-y divide-line" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visible.map((step, index) => (
          <li
            key={`${uid}-${index}`}
            className="animate-plate-in flex gap-4 px-5 py-4"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-wash text-xs font-bold text-primary-deep"
              aria-hidden="true"
            >
              {toPersian(index + 1)}
            </span>
            <div className="min-w-0 flex-1">
              {step.title && <p className="mb-1 font-display text-sm font-bold text-ink">{step.title}</p>}
              {step.content && <p className="text-sm leading-relaxed text-ink/90">{step.content}</p>}
              {step.html && (
                <div
                  dir="ltr"
                  className="mt-3 overflow-x-auto rounded bg-surface-sunken px-4 py-3 text-center"
                  dangerouslySetInnerHTML={{ __html: step.html }}
                />
              )}
            </div>
          </li>
        ))}
      </ol>

      {remaining > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-sunken/40 px-5 py-3">
          <button
            type="button"
            onClick={revealNext}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-on transition-colors duration-fast hover:bg-primary-deep"
          >
            گام بعدی را ببینید
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m12 4-6 6 6 6" />
            </svg>
          </button>
          {mode === 'manual' && remaining > 1 && (
            <button
              type="button"
              onClick={revealAll}
              className="inline-flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
            >
              همهٔ گام‌ها
            </button>
          )}
          <span className="self-center text-xs text-ink-faint" aria-live="polite">
            {toPersian(remaining)} گام باقی مانده
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-success/30 bg-success-soft px-5 py-3">
          <p className="text-sm font-bold text-success">همهٔ گام‌ها نمایش داده شد.</p>
          {mode === 'manual' && steps.length > 1 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
            >
              از ابتدا
            </button>
          )}
        </div>
      )}
    </section>
  );
}