import type { SearchableItem } from '../../lib/types';

/**
 * Shared search payload reader (plan 024).
 *
 * `BaseLayout` serializes the index once per page into
 * `<script type="application/json" id="site-search-index">`; both the command
 * palette and the search island read it from the DOM instead of receiving it
 * as island props (which Astro would serialize once per island). The parse is
 * cached per page load so both consumers share one object.
 *
 * Server-side there is no DOM: callers must pass an explicit fallback (the
 * search island's SSR render) or accept an empty array (the palette renders
 * nothing until opened, so it never needs server data).
 */

const SCRIPT_ID = 'site-search-index';

let cache: SearchableItem[] | null = null;
let cacheSource: string | null = null;

export function readSiteSearchIndex(fallback: SearchableItem[] = []): SearchableItem[] {
  if (typeof document === 'undefined') return fallback;
  const el = document.getElementById(SCRIPT_ID);
  if (!el) return fallback;
  const raw = el.textContent ?? '';
  if (cache && cacheSource === raw) return cache;
  try {
    const parsed = JSON.parse(raw) as SearchableItem[];
    cache = Array.isArray(parsed) ? parsed : fallback;
  } catch {
    cache = fallback;
  }
  cacheSource = raw;
  return cache;
}
