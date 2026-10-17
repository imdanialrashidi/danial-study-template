import { describe, expect, it } from 'vitest';
import type { SearchableItem } from '../../src/lib/types.ts';
import {
  DEFAULT_SEARCH_WEIGHTS,
  normalizeIndexEntry,
  rankSearchItems,
  scoreSearchItem,
} from '../../src/lib/search.ts';
import { normalizePersian } from '../../src/lib/utils.ts';

/**
 * Pins the converged search scorer (plan 021) verbatim on the `SearchIsland`
 * weight contract: title-prefix 12 / substring 8, tag 5, body word-start 4 /
 * substring 2, every-term-must-match elimination.
 */

function item(overrides: Partial<SearchableItem> = {}): SearchableItem {
  return {
    id: 'x',
    title: 'مشتق توابع',
    slug: 'x',
    type: 'lesson',
    excerpt: 'آشنایی با مشتق و حد',
    tags: ['حسابان'],
    href: '/x',
    ...overrides,
  };
}

const normOf = (entry: SearchableItem) => normalizeIndexEntry(entry);
const termsOf = (q: string) => normalizePersian(q).split(/\s+/).filter(Boolean);

describe('scoreSearchItem ordering pins', () => {
  it('ranks title-prefix > title-substring > tag-only > body-only', () => {
    const prefix = item({ id: 'p', title: 'مشتق پیشرفته', excerpt: 'دیگر', tags: ['دیگر'] });
    const substr = item({ id: 's', title: 'قواعد مشتق‌گیری', excerpt: 'دیگر', tags: ['دیگر'] });
    const tagOnly = item({ id: 't', title: 'انتگرال معین', excerpt: 'دیگر', tags: ['مشتق'] });
    const bodyOnly = item({ id: 'b', title: 'انتگرال معین', excerpt: 'کاربرد مشتق در فیزیک', tags: ['دیگر'] });
    const terms = termsOf('مشتق');
    const scores = [prefix, substr, tagOnly, bodyOnly].map((e) =>
      scoreSearchItem(e, normOf(e), terms),
    );
    // prefix 12+2=14 (haystack starts with the term: no word-start bonus),
    // substring 8+4=12, tag-only 5+4=9, body-only 4
    expect(scores).toEqual([14, 12, 9, 4]);
    const [p, s, t, b] = scores;
    expect(p).toBeGreaterThan(s);
    expect(s).toBeGreaterThan(t);
    expect(t).toBeGreaterThan(b);
  });

  it('scores tag-only matches (title/excerpt miss, tag hits)', () => {
    const entry = item({ title: 'انتگرال معین', excerpt: 'پیوستگی توابع', tags: ['حد و مشتق'] });
    expect(scoreSearchItem(entry, normOf(entry), termsOf('مشتق'))).toBe(
      DEFAULT_SEARCH_WEIGHTS.tag + DEFAULT_SEARCH_WEIGHTS.bodyWordStart,
    );
  });

  it('eliminates items when any term matches nowhere', () => {
    const entry = item();
    expect(scoreSearchItem(entry, normOf(entry), termsOf('مشتق انتگرال'))).toBe(0);
  });

  it('returns 0 for empty terms', () => {
    const entry = item();
    expect(scoreSearchItem(entry, normOf(entry), [])).toBe(0);
  });

  it('uses the SearchIsland weight table by default', () => {
    expect(DEFAULT_SEARCH_WEIGHTS).toEqual({
      titlePrefix: 12,
      titleSubstring: 8,
      tag: 5,
      bodyWordStart: 4,
      bodySubstring: 2,
    });
  });
});

describe('rankSearchItems (shared rank seam)', () => {
  const index: SearchableItem[] = [
    item({ id: 'a', title: 'مشتق توابع', excerpt: 'تعریف مشتق', tags: ['حسابان'] }),
    item({ id: 'b', title: 'قواعد مشتق‌گیری', excerpt: 'دیگر', tags: ['دیگر'] }),
    item({ id: 'c', title: 'حد و پیوستگی', excerpt: 'مقدمه مشتق', tags: ['دیگر'] }),
    item({ id: 'd', title: 'انتگرال معین', excerpt: 'دیگر', tags: ['دیگر'] }),
  ];

  const ids = (query: string, options: { limit: number; minQueryLength?: number; emptyFill?: number }) =>
    rankSearchItems(index, query, options).map((r) => r.item.id);

  it('returns identical relative order under both call-site limits', () => {
    expect(ids('مشتق', { limit: 40, minQueryLength: 2 })).toEqual(['a', 'b', 'c']);
    expect(ids('مشتق', { limit: 8 })).toEqual(['a', 'b', 'c']);
  });

  it('returns nothing for a short query on the search page, first hits for an empty palette', () => {
    expect(ids('م', { limit: 40, minQueryLength: 2 })).toEqual([]);
    expect(ids('', { limit: 8, emptyFill: 8 })).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('normalizeIndexEntry', () => {
  it('equals the inline title+excerpt+tags normalization', () => {
    const entry = item();
    expect(normOf(entry)).toBe(
      normalizePersian(`${entry.title} ${entry.excerpt ?? ''} ${(entry.tags ?? []).join(' ')}`),
    );
  });

  it('accepts an entry carrying _norm without recomputation', () => {
    const entry = item();
    const withNorm = { ...entry, _norm: normOf(entry) };
    expect(scoreSearchItem(entry, withNorm, termsOf('مشتق'))).toBe(
      scoreSearchItem(entry, normOf(entry), termsOf('مشتق')),
    );
  });
});
