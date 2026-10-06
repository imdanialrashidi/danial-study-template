/**
 * Accessibility primitives shared by islands and Astro components.
 *
 * - `PREFERS_REDUCED_MOTION` / `useReducedMotion()` — islands disable
 *   non-essential animation when the learner asked for less motion.
 * - `trapFocus()` — tiny focus trap for dialogs (command palette).
 * - `restoreFocus()` — return focus to the trigger on close.
 *
 * CSS in `src/styles/global.css` already provides the visible `:focus-visible`
 * ring and the global reduced-motion kill-switch; these helpers cover the
 * behaviour CSS cannot: focus containment and motion-aware JS.
 */

export const PREFERS_REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(PREFERS_REDUCED_MOTION_QUERY).matches;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keep Tab cycling inside `container`; returns a cleanup function. */
export function trapFocus(container: HTMLElement): () => void {
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  container.addEventListener('keydown', onKeyDown);
  return () => container.removeEventListener('keydown', onKeyDown);
}

/** Focus the first focusable descendant, falling back to the container. */
export function focusFirst(container: HTMLElement): void {
  const target = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  (target ?? container).focus();
}
