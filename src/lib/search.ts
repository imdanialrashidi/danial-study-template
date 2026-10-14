import type { SearchableItem } from './types';
import { normalizePersian } from './utils';

/**
 * Unified search scorer (plan 021).
 *
 * Converges the forked scorers from `SearchIsland.tsx` (title-prefix 12 /
 * substring 8, tag 5, body word-start 4 / substring 2) and
 * `CommandPalette.tsx` (10/6/2, no tag tier) onto the pinned `SearchIsland`
 * contract — the better-tested oracle. Weights stay an explicit parameter so
 * a future retune is a data change with test pins, not a second fork.
 *
 * Limits (40 vs 8) remain call-site parameters; this module owns *how* items
 * score, not *what* is scored or how many hits are shown.
 */

export interface SearchWeights {
  /** Normalized title starts with the term. */
  titlePrefix: number;
  /** Normalized title contains the term elsewhere. */
  titleSubstring: number;
  /** Any normalized tag contains the term. */
  tag: number;
  /** Haystack contains the term at a word start (` ${term}`). */
  bodyWordStart: number;
  /** Haystack contains the term mid-word. */
  bodySubstring: number;
}

/** Pinned `SearchIsland` weight table — the converged default. */
export const DEFAULT_SEARCH_WEIGHTS: SearchWeights = {
  titlePrefix: 12,
  titleSubstring: 8,
  tag: 5,
  bodyWordStart: 4,
  bodySubstring: 2,
};

/** A `SearchableItem` with its precomputed normalized haystack. */
export type NormalizedSearchEntry = SearchableItem & { _norm: string };

/**
 * Precompute the normalized haystack for one index entry:
 * title + excerpt + tags through the shared `normalizePersian` oracle.
 * Memoize per entry so per-keystroke scoring never renormalizes.
 */
export function normalizeIndexEntry(item: SearchableItem): string {
  return normalizePersian(`${item.title} ${item.excerpt ?? ''} ${(item.tags ?? []).join(' ')}`);
}

/**
 * Score one item against pre-normalized query terms.
 *
 * Every term must match somewhere (title, tag, or haystack) or the item
 * scores 0 and is eliminated. An empty term list scores 0 — callers decide
 * what an empty query shows (palette top-8 vs. search idle state).
 *
 * @param item  The original item (title/tags read from here).
 * @param norm  Precomputed haystack string, or an entry carrying `_norm`.
 *              Falls back to `normalizeIndexEntry(item)` when absent.
 * @param terms Normalized query terms (e.g. `normalizePersian(q).split(/\s+/)`).
 * @param weights Explicit weight table; defaults to the pinned contract.
 */
export function scoreSearchItem(
  item: SearchableItem,
  norm: string | (SearchableItem & { _norm?: string }),
  terms: string[],
  weights: SearchWeights = DEFAULT_SEARCH_WEIGHTS,
): number {
  if (terms.length === 0) return 0;
  const title = normalizePersian(item.title);
  const haystack =
    typeof norm === 'string' ? norm : (norm._norm ?? normalizeIndexEntry(item));
  let total = 0;

  for (const term of terms) {
    if (title.startsWith(term)) total += weights.titlePrefix;
    else if (title.includes(term)) total += weights.titleSubstring;

    if ((item.tags ?? []).some((tag) => normalizePersian(tag).includes(term)))
      total += weights.tag;

    if (haystack.includes(term)) total += haystack.includes(` ${term}`) ? weights.bodyWordStart : weights.bodySubstring;
    else return 0; // every term must match somewhere
  }

  return total;
}
