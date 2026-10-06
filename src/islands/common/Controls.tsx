import { useId, useState, type ReactNode } from 'react';
import { prefersReducedMotion } from '../../lib/a11y';

/**
 * Generic interactive primitives — the course-agnostic building blocks for
 * every simulation a course may need.
 *
 * - `Slider` — labelled range input with a live Persian-digit readout.
 * - `Toggle` — switch with `role="switch"` and keyboard support built in.
 * - `Tabs` — keyboard-navigable tabs (arrows + Home/End, roving tabindex).
 * - `Reveal` — disclosure for hints and answers.
 * - `LiveReadout` — a `role="status"` line so parameter changes are
 *   announced to screen readers without moving focus.
 * - `FunctionPlot` — thin-stroke SVG graph of `y = fn(x)`; re-renders from
 *   props, no chart library, respects reduced motion (no transition).
 *
 * `ParamLab` composes them into one ready demo (slope explorer) that a course
 * can drop into any lesson. All components ship their copy in static HTML via
 * the Astro wrapper, so no-JS readers still see the settled values.
 */

const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const fa = (v: number | string): string => String(v).replace(/\d/g, (d) => FA[Number(d)]);
const fmt = (v: number, digits = 2): string => fa(v.toFixed(digits));

/* ── Slider ─────────────────────────────────────────────────────────────── */

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step = 0.1, unit, onChange }: SliderProps) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
        <output htmlFor={id} className="rounded bg-surface-sunken px-2 py-0.5 font-mono text-xs text-ink" dir="ltr">
          {value}{unit ? ` ${unit}` : ''}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-[44px] w-full accent-[rgb(var(--rgb-primary))]"
      />
    </div>
  );
}

/* ── Toggle ─────────────────────────────────────────────────────────────── */

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}

export function Toggle({ label, checked, onChange, hint }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-[44px] items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-line-control"
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-surface-sunken'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'start-4' : 'start-0.5'}`}
        />
      </span>
      <span>{label}</span>
      {hint && <span className="text-xs font-normal text-ink-faint">{hint}</span>}
    </button>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const [active, setActive] = useState(0);
  const base = useId().replace(/:/g, '');
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 border-b border-line">
        {items.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${base}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${base}-panel-${i}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                // RTL: ArrowLeft moves forward through tabs.
                const dir = e.key === 'ArrowLeft' ? 1 : -1;
                const next = (active + dir + items.length) % items.length;
                setActive(next);
                document.getElementById(`${base}-tab-${next}`)?.focus();
              } else if (e.key === 'Home') {
                e.preventDefault();
                setActive(0);
                document.getElementById(`${base}-tab-0`)?.focus();
              } else if (e.key === 'End') {
                e.preventDefault();
                setActive(items.length - 1);
                document.getElementById(`${base}-tab-${items.length - 1}`)?.focus();
              }
            }}
            className={`-mb-px min-h-[44px] border-b-2 px-4 py-2 text-sm transition-colors ${
              i === active
                ? 'border-primary font-bold text-primary-deep'
                : 'border-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {items.map((tab, i) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${i}`}
          aria-labelledby={`${base}-tab-${i}`}
          hidden={i !== active}
          className="py-4 text-sm leading-relaxed text-ink/90"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

/* ── Reveal ─────────────────────────────────────────────────────────────── */

export function Reveal({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-line">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-sm font-bold text-ink"
      >
        <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="m5 7.5 5 5 5-5" />
        </svg>
        {title}
      </button>
      {open && <div className="border-t border-line px-3 py-3 text-sm leading-relaxed text-ink/90">{children}</div>}
    </div>
  );
}

/* ── LiveReadout ────────────────────────────────────────────────────────── */

export function LiveReadout({ text }: { text: string }) {
  return (
    <p role="status" className="rounded-md bg-surface-sunken/70 px-3 py-2 text-sm leading-relaxed text-ink">
      {text}
    </p>
  );
}

/* ── FunctionPlot (SVG, no chart dependency) ────────────────────────────── */

export interface FunctionPlotProps {
  /** y = fn(x) sampled over [xMin, xMax]. */
  fn: (x: number) => number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  label: string;
  width?: number;
  height?: number;
}

export function FunctionPlot({ fn, xMin = -5, xMax = 5, yMin, yMax, label, width = 340, height = 190 }: FunctionPlotProps) {
  const N = 60;
  const ys: number[] = [];
  for (let i = 0; i <= N; i++) ys.push(fn(xMin + ((xMax - xMin) * i) / N));
  const lo = yMin ?? Math.min(...ys);
  const hi = yMax ?? Math.max(...ys);
  const span = hi - lo || 1;
  const px = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
  const py = (y: number) => height - ((y - lo) / span) * height;
  const d = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${px(xMin + ((xMax - xMin) * i) / N).toFixed(1)} ${py(y).toFixed(1)}`).join(' ');
  const zeroY = lo <= 0 && hi >= 0 ? py(0) : null;
  const reduced = typeof window !== 'undefined' && prefersReducedMotion();
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="block h-auto w-full">
      {zeroY !== null && <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="currentColor" strokeWidth="1" opacity="0.35" className="text-ink" />}
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" style={reduced ? undefined : { transition: 'd 120ms ease-out' }} />
    </svg>
  );
}

/* ── ParamLab: ready-made slope explorer ──────────────────────────────────
   y = m·x + b. Two sliders, a live readout, and an SVG plot. A course drops
   `<ParamLab />` into any lesson; the settled static HTML already shows the
   default line so no-JS readers see the same figure. */

export interface ParamLabProps {
  initialSlope?: number;
  initialIntercept?: number;
  title?: string;
}

export default function ParamLab({ initialSlope = 1, initialIntercept = 0, title = 'آزمایشگاه شیب خط' }: ParamLabProps) {
  const [m, setM] = useState(initialSlope);
  const [b, setB] = useState(initialIntercept);
  const [showGrid, setShowGrid] = useState(true);
  return (
    <section aria-label={title} className="my-7 rounded-lg border border-line bg-surface px-5 py-5" data-hydrated="true">
      <p className="text-xs font-bold tracking-wide text-ink-faint">{title} — <span dir="ltr">y = mx + b</span></p>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-4">
          <Slider label="شیب خط (m)" value={m} min={-3} max={3} step={0.1} onChange={setM} />
          <Slider label="عرض از مبدأ (b)" value={b} min={-4} max={4} step={0.5} onChange={setB} />
          <Toggle label="خطوط راهنما" checked={showGrid} onChange={setShowGrid} />
          <LiveReadout text={`در نقطهٔ x = ۲، مقدار y برابر ${fmt(m * 2 + b)} است — شیب ${fmt(m)} یعنی به‌ازای هر واحد x، مقدار ${fmt(Math.abs(m))} ${m >= 0 ? 'زیاد' : 'کم'} می‌شود.`} />
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-surface-sunken/60 p-2">
          <FunctionPlot fn={(x) => m * x + b} yMin={-8} yMax={8} label={`نمودار خط با شیب ${m} و عرض از مبدأ ${b}`} />
          {showGrid && <p className="px-1 pb-1 pt-1 text-center text-2xs text-ink-faint">بازهٔ x از ۵- تا ۵، y از ۸- تا ۸</p>}
        </div>
      </div>
    </section>
  );
}
