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
 * Ranking (score, order, slice, empty-query policy) lives here too behind
 * `rankSearchItems`: limits (40 vs 8) and empty fills stay call-site
 * parameters, so a retune is a data change with test pins, not a second fork.
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
 * Search-only normalization: Persian normalization plus ZWNJ folding.
 *
 * `normalizePersian` keeps U+200C for tokenization. Search must treat
 * «زنجیره‌ای» and «زنجیرهای» as the same word, so the search layer removes it
 * from both the index and the query.
 */
export function normalizeSearchText(value: string): string {
  return normalizePersian(value).replace(/\u200C/g, '');
}

/**
 * Precompute the normalized haystack for one index entry:
 * title + excerpt + tags through the shared search normalization.
 * Memoize per entry so per-keystroke scoring never renormalizes.
 */
export function normalizeIndexEntry(item: SearchableItem): string {
  return normalizeSearchText(`${item.title} ${item.excerpt ?? ''} ${(item.tags ?? []).join(' ')}`);
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
 * @param terms Normalized query terms (e.g. `normalizeSearchText(q).split(/\s+/)`).
 * @param weights Explicit weight table; defaults to the pinned contract.
 */
export function scoreSearchItem(
  item: SearchableItem,
  norm: string | (SearchableItem & { _norm?: string }),
  terms: string[],
  weights: SearchWeights = DEFAULT_SEARCH_WEIGHTS,
): number {
  if (terms.length === 0) return 0;
  const title = normalizeSearchText(item.title);
  const haystack =
    typeof norm === 'string' ? norm : (norm._norm ?? normalizeIndexEntry(item));
  let total = 0;

  for (const term of terms) {
    if (title.startsWith(term)) total += weights.titlePrefix;
    else if (title.includes(term)) total += weights.titleSubstring;

    if ((item.tags ?? []).some((tag) => normalizeSearchText(tag).includes(term)))
      total += weights.tag;

    if (haystack.includes(term)) total += haystack.includes(` ${term}`) ? weights.bodyWordStart : weights.bodySubstring;
    else return 0; // every term must match somewhere
  }

  return total;
}
export interface RankedSearchItem {
  item: SearchableItem;
  score: number;
}

export interface RankSearchOptions {
  /** Maximum hits returned. */
  limit: number;
  /** Queries shorter than this (normalized) yield no hits. The search page passes 2. */
  minQueryLength?: number;
  /** An empty query returns the first N items unscored instead of nothing. The palette passes 8. */
  emptyFill?: number;
  weights?: SearchWeights;
}

/**
 * Rank one query against the index: score every entry, drop misses, order by
 * score then Persian title, slice to `limit`.
 *
 * Islands keep input state and markup; everything about ordering lives here,
 * so the next ranking fix lands once and result order is testable through
 * this interface.
 */
export function rankSearchItems(
  items: (SearchableItem & { _norm?: string })[],
  query: string,
  options: RankSearchOptions,
): RankedSearchItem[] {
  const { limit, minQueryLength = 0, emptyFill = 0, weights = DEFAULT_SEARCH_WEIGHTS } = options;
  const normalized = normalizeSearchText(query);
  const terms = normalized.split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return emptyFill > 0 ? items.slice(0, emptyFill).map((item) => ({ item, score: 1 })) : [];
  }
  if (normalized.length < minQueryLength) return [];
  // Entries carrying `_norm` reuse it; the islands memoize that shape per
  // index load, so per-keystroke ranking never renormalizes the corpus.
  return items
    .map((item) => ({ item, score: scoreSearchItem(item, item, terms, weights) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'fa'))
    .slice(0, limit);
}
