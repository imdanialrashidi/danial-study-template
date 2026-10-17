import { describe, it, expect } from 'vitest';
import { resolveInList, resolveSavedRows } from '../../src/lib/resolve.ts';
import { type SavedEntry } from '../../src/islands/common/SavedList.tsx';

/**
 * Tolerant bookmark matcher contract: stored ids are bare slugs
 * (bookmark writes pass `entry.id`), so a saved id resolves against both the
 * qualified `<kind>/<slug>` identity and the bare slug. Exact qualified wins,
 * a bare id resolves only when unique, and stale/ambiguous ids are pruned.
 * Resolution runs through the shared resolver in `src/lib/resolve.ts` — the
 * same rule the build side uses for content references.
 */

const entry = (
  kind: SavedEntry['kind'],
  id: string,
  extra: Partial<SavedEntry> = {},
): SavedEntry => ({
  id,
  qualifiedId: `${kind}/${id}`,
  title: `${kind}:${id}`,
  href: `/${kind}/${id}`,
  kind,
  section: 's1',
  ...extra,
});

const entries: SavedEntry[] = [
  entry('lesson', 'shared'),
  entry('concept', 'shared'),
  entry('formula', 'unique'),
  entry('glossary', 'term'),
];

describe('saved identity resolution (shared resolver rule)', () => {
  it('prefers the exact qualified match', () => {
    expect(resolveInList(entries, 'lesson/shared')?.qualifiedId).toBe('lesson/shared');
    expect(resolveInList(entries, 'concept/shared')?.qualifiedId).toBe('concept/shared');
  });

  it('resolves a unique bare slug', () => {
    expect(resolveInList(entries, 'unique')?.qualifiedId).toBe('formula/unique');
  });

  it('resolves nothing for an ambiguous bare slug', () => {
    expect(resolveInList(entries, 'shared')).toBeUndefined();
  });

  it('resolves nothing for a stale id', () => {
    expect(resolveInList(entries, 'lesson/gone')).toBeUndefined();
    expect(resolveInList(entries, 'gone')).toBeUndefined();
  });
});

describe('resolveSavedRows', () => {
  it('keeps course order and drops stale ids silently', () => {
    const rows = resolveSavedRows(['stale-id', 'formula/unique', 'glossary/term'], entries);
    expect(rows.map((r) => r.entry.qualifiedId)).toEqual(['formula/unique', 'glossary/term']);
  });

  it('dedupes an entry bookmarked under both forms', () => {
    const rows = resolveSavedRows(['unique', 'formula/unique'], entries);
    expect(rows.map((r) => r.entry.qualifiedId)).toEqual(['formula/unique']);
  });

  it('never attaches an ambiguous bare slug to either entry', () => {
    expect(resolveSavedRows(['shared'], entries)).toEqual([]);
  });

  it('remembers the exact stored id for removal', () => {
    const rows = resolveSavedRows(['unique'], entries);
    expect(rows[0]?.bookmark).toBe('unique');
  });
});
