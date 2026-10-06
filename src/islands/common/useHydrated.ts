import { useEffect, useState } from 'react';

/**
 * Marks an island as hydrated.
 *
 * A React component rendered from MDX without a `client:*` directive produces
 * HTML that looks correct but never responds to interaction. Exposing a stable
 * `data-hydrated` signal turns that silent failure into something a build-time
 * or browser check can assert, so it cannot regress unnoticed.
 *
 * Returns false during SSR and the first client render, then true.
 */
export function useHydrated(island: string): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    document.documentElement.dataset[`${island}Hydrated`] = 'true';
  }, [island]);
  return hydrated;
}
