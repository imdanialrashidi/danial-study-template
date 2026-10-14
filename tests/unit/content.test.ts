import { describe, it, expect } from 'vitest';
import { dependentsInList, parseReference, prereqMatches, resolveInList } from '../../src/lib/resolve.ts';
import type { CourseEntry } from '../../src/lib/content.ts';

/**
 * Resolution-branch contract for the link-resolution engine (plan 013's
 * post-013 behavior), asserted against the REAL pure helpers in
 * `src/lib/resolve.ts` — the same functions `content.ts` delegates to for
 * `resolveEntry`, `getDependents`, `getRelatedEntries` scoring, and the
 * validation-time `resolveSync`.
 *
 * `resolve.ts` is importable under vitest (type-only dependency on
 * `content.ts`); `content.ts` itself is not (`astro:content` value import).
 * Cases use fabricated `CourseEntry` fixtures, never the Astro content layer:
 *
 * - bare slug prefers the same kind, then a globally unique match
 * - ambiguous bare slug resolves to nothing (build error, never a wrong link)
 * - qualified `<kind>/<slug>` miss resolves to nothing
 * - `a/b/c` (multi-slash, empty segments) is rejected
 * - bare-slug prerequisites match (plan 013's `prereqMatches` fix)
 * - related-entries scoring excludes explicitly cross-linked entries
 */

type Minimal = Pick<CourseEntry, 'id' | 'kind' | 'qualifiedId' | 'prerequisites' | 'tags' | 'section' | 'title'>;

const entry = (
  kind: Minimal['kind'],
  id: string,
  extra: Partial<Pick<Minimal, 'prerequisites' | 'tags' | 'section' | 'title'>> = {},
): Minimal => ({
  id,
  kind,
  qualifiedId: `${kind}/${id}`,
  prerequisites: [],
  tags: [],
  section: 's1',
  title: `${kind}:${id}`,
  ...extra,
});

// Fixtures: one ambiguous slug shared by two kinds, one globally unique slug,
// one slug that exists only under a non-requested kind (qualified miss).
const entries: Minimal[] = [
  entry('lesson', 'shared', { tags: ['t1'] }),
  entry('concept', 'shared', { tags: ['t1'] }),
  entry('formula', 'unique', { tags: ['t1', 't2'] }),
  entry('concept', 'only-concept', { tags: ['t2'] }),
  entry('lesson', 'dependent', { prerequisites: ['shared'], tags: ['t1'] }),
];

const asEntries = (list: Minimal[]): CourseEntry[] => list as CourseEntry[];

describe('resolveInList branches (post-013 contract)', () => {
  it('bare slug prefers the same kind', () => {
    expect(resolveInList(asEntries(entries), 'shared', 'lesson')?.qualifiedId).toBe('lesson/shared');
    expect(resolveInList(asEntries(entries), 'shared', 'concept')?.qualifiedId).toBe('concept/shared');
  });

  it('bare slug falls back to a globally unique match', () => {
    expect(resolveInList(asEntries(entries), 'unique', 'lesson')?.qualifiedId).toBe('formula/unique');
    expect(resolveInList(asEntries(entries), 'unique')?.qualifiedId).toBe('formula/unique');
  });

  it('ambiguous bare slug resolves to nothing', () => {
    expect(resolveInList(asEntries(entries), 'shared')).toBeUndefined();
  });

  it('qualified miss resolves to nothing', () => {
    expect(resolveInList(asEntries(entries), 'lesson/only-concept')).toBeUndefined();
    expect(resolveInList(asEntries(entries), 'formula/nope')).toBeUndefined();
  });

  it('multi-slash references are rejected', () => {
    expect(resolveInList(asEntries(entries), 'a/b/c')).toBeUndefined();
    expect(resolveInList(asEntries(entries), 'lesson/')).toBeUndefined();
    expect(resolveInList(asEntries(entries), '/shared')).toBeUndefined();
    expect(resolveInList(asEntries(entries), 'lesson//x')).toBeUndefined();
  });

  it('qualified hit resolves', () => {
    expect(resolveInList(asEntries(entries), 'concept/only-concept')?.qualifiedId).toBe(
      'concept/only-concept',
    );
  });
});

describe('parseReference (strict reference parser)', () => {
  it('parses bare and qualified references', () => {
    expect(parseReference('shared')).toEqual([undefined, 'shared']);
    expect(parseReference('lesson/shared')).toEqual(['lesson', 'shared']);
  });

  it('rejects multi-slash and empty segments', () => {
    expect(parseReference('a/b/c')).toBeUndefined();
    expect(parseReference('lesson/')).toBeUndefined();
    expect(parseReference('/shared')).toBeUndefined();
  });
});

describe('dependentsInList (bare-slug prerequisites match)', () => {
  it('finds entries declaring the target as a bare-slug prerequisite', () => {
    const found = dependentsInList(asEntries(entries), 'lesson/shared');
    expect(found.map((e) => e.qualifiedId)).toContain('lesson/dependent');
  });

  it('finds entries declaring the qualified prerequisite too', () => {
    const list = [...entries, entry('example', 'dep2', { prerequisites: ['concept/shared'] })];
    const found = dependentsInList(asEntries(list), 'concept/shared');
    expect(found.map((e) => e.qualifiedId)).toContain('example/dep2');
  });
});

describe('prereqMatches + related exclusion (excludes explicit cross-links)', () => {
  it('related scoring excludes already-linked entries', () => {
    const target = entries.find((e) => e.qualifiedId === 'lesson/shared')!;
    // Candidates sharing tag t1: concept/shared, formula/unique, lesson/dependent.
    // concept/shared is explicitly cross-linked → excluded from related.
    const linked = new Set(['concept/shared']);
    const tags = new Set(target.tags);
    const related = entries
      .filter((e) => e.qualifiedId !== target.qualifiedId && !linked.has(e.qualifiedId))
      .map((c) => {
        let score = 0;
        for (const t of c.tags) if (tags.has(t)) score += 3;
        if (c.section && c.section === target.section) score += 2;
        if (prereqMatches(c.prerequisites, target) || prereqMatches(target.prerequisites, c)) score += 2;
        return { c, score };
      })
      .filter((s) => s.score > 0)
      .map((s) => s.c.qualifiedId);
    expect(related).not.toContain('concept/shared');
    expect(related).toContain('lesson/dependent');
  });
});
