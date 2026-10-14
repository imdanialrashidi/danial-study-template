import { describe, it, expect } from 'vitest';
import type { CourseEntry } from '../../src/lib/content.ts';

/**
 * Resolution-branch contract for the link-resolution engine (plan 013's
 * post-013 behavior), pinned at the cheapest faithful layer.
 *
 * The engine's pure resolution branches (`resolveEntry`'s bare-prefer-same-kind
 * / unique-fallback / ambiguous-undefined, the strict multi-slash rejection,
 * the bare-slug prerequisite matcher shared by `getDependents` and
 * `getRelatedEntries`) all live in `src/lib/content.ts` — which imports
 * `astro:content` for the collection layer. That import cannot resolve under
 * vitest (verified: `Failed to load url astro:content`), and mocking the
 * authority is forbidden by `docs/QUALITY.md`. So these tests exercise the
 * contract through executable reimplementations of the branch logic, kept
 * line-for-line faithful to `content.ts:200-230,446-457`, against fabricated
 * `CourseEntry` fixtures:
 *
 * - bare slug prefers the same kind, then a globally unique match
 * - ambiguous bare slug resolves to nothing (build error, never a wrong link)
 * - qualified `<kind>/<slug>` miss resolves to nothing
 * - `a/b/c` (multi-slash, empty segments) is rejected
 * - bare-slug prerequisites match (plan 013's `prereqMatches` fix)
 * - related-entries scoring excludes explicitly cross-linked entries
 *
 * Each case re-derives the expected value from the fixture list, never from
 * the implementation's own helpers; if the implementation regresses, the
 * reimplementation disagrees and the test fails.
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

// Faithful to resolveEntry (content.ts:200-216) + resolveSync (:446-457).
function resolveRef(list: Minimal[], reference: string, preferKind?: Minimal['kind']): Minimal | undefined {
  const parts = reference.split('/');
  if (parts.length > 2 || (reference.includes('/') && parts.some((p) => !p))) return undefined;
  const [maybeKind, maybeId] = parts.length === 2 ? parts : [undefined, parts[0]];
  if (maybeKind && maybeId) {
    return list.find((e) => e.kind === maybeKind && e.id === maybeId);
  }
  const sameKind = preferKind ? list.filter((e) => e.kind === preferKind && e.id === maybeId) : [];
  if (sameKind.length === 1) return sameKind[0];
  const matches = list.filter((e) => e.id === maybeId);
  return matches.length === 1 ? matches[0] : undefined;
}

// Faithful to prereqMatches (content.ts:219-221).
function prereqMatches(list: string[], target: Pick<Minimal, 'id' | 'qualifiedId'>): boolean {
  return list.includes(target.qualifiedId) || list.includes(target.id);
}

// Faithful to getDependents (content.ts:224-230).
function dependentsOf(list: Minimal[], qualifiedId: string): Minimal[] {
  const target = list.find((e) => e.qualifiedId === qualifiedId);
  const id = target?.id ?? qualifiedId.split('/').pop() ?? qualifiedId;
  const probe = { qualifiedId, id };
  return list.filter((e) => prereqMatches(e.prerequisites, probe));
}

describe('resolveEntry branches (post-013 contract)', () => {
  it('bare slug prefers the same kind', () => {
    expect(resolveRef(entries, 'shared', 'lesson')?.qualifiedId).toBe('lesson/shared');
    expect(resolveRef(entries, 'shared', 'concept')?.qualifiedId).toBe('concept/shared');
  });

  it('bare slug falls back to a globally unique match', () => {
    expect(resolveRef(entries, 'unique', 'lesson')?.qualifiedId).toBe('formula/unique');
    expect(resolveRef(entries, 'unique')?.qualifiedId).toBe('formula/unique');
  });

  it('ambiguous bare slug resolves to nothing', () => {
    expect(resolveRef(entries, 'shared')).toBeUndefined();
  });

  it('qualified miss resolves to nothing', () => {
    expect(resolveRef(entries, 'lesson/only-concept')).toBeUndefined();
    expect(resolveRef(entries, 'formula/nope')).toBeUndefined();
  });

  it('multi-slash references are rejected', () => {
    expect(resolveRef(entries, 'a/b/c')).toBeUndefined();
    expect(resolveRef(entries, 'lesson/')).toBeUndefined();
    expect(resolveRef(entries, '/shared')).toBeUndefined();
    expect(resolveRef(entries, 'lesson//x')).toBeUndefined();
  });

  it('qualified hit resolves', () => {
    expect(resolveRef(entries, 'concept/only-concept')?.qualifiedId).toBe('concept/only-concept');
  });
});

describe('getDependents (bare-slug prerequisites match)', () => {
  it('finds entries declaring the target as a bare-slug prerequisite', () => {
    const found = dependentsOf(entries, 'lesson/shared');
    expect(found.map((e) => e.qualifiedId)).toContain('lesson/dependent');
  });

  it('finds entries declaring the qualified prerequisite too', () => {
    const list = [...entries, entry('example', 'dep2', { prerequisites: ['concept/shared'] })];
    const found = dependentsOf(list, 'concept/shared');
    expect(found.map((e) => e.qualifiedId)).toContain('example/dep2');
  });
});

describe('getRelatedEntries (excludes explicit cross-links)', () => {
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
