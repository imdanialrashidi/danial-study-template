import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';

const CommandPaletteDialog = lazy(() => import('./CommandPaletteDialog'));

/**
 * Command palette trigger — the cheap global half of the palette.
 *
 * Hydrates on idle on every page, but stays tiny: two global listeners
 * (the `Ctrl/⌘+K` shortcut + declarative `data-open-palette` triggers) and no
 * index data. The scoring dialog (plus its normalized index) loads on first
 * open via `React.lazy`, so React hydration of the heavy half defers until
 * the palette is actually used.
 *
 * Contracts preserved: `data-open-palette` opens the palette, and the
 * `paletteHydrated` QA marker still signals that the shortcut is live.
 */

export interface CommandPaletteProps {
  /** Accepted for backward compatibility; ignored — the shared payload wins. */
  items?: never;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  // Global shortcut + declarative triggers. Stays mounted while the dialog
  // is open so a second Ctrl/⌘+K toggles it closed.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (!open) triggerRef.current = document.activeElement as HTMLElement | null;
        setOpen((v) => !v);
      }
    }
    function onTriggerClick(e: Event) {
      const el = (e.target as HTMLElement).closest('[data-open-palette]');
      if (!el) return;
      e.preventDefault();
      triggerRef.current = el as HTMLElement;
      setOpen(true);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onTriggerClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onTriggerClick);
    };
  }, [open ]);

  useEffect(() => {
    document.documentElement.dataset.paletteHydrated = 'true';
  }, []);

  if (!open) return null;

  return (
    <Suspense fallback={null}>
      <CommandPaletteDialog trigger={triggerRef.current} onClose={close} />
    </Suspense>
  );
}
