import { describe, it, expect } from 'vitest';
import {
  matchSavedEntry,
  resolveSavedRows,
  type SavedEntry,
} from '../../src/islands/common/SavedList.tsx';

/**
 * Tolerant bookmark matcher contract (plan 022): stored ids are bare slugs
 * (bookmark writes pass `entry.id`), so a saved id resolves against both the
 * qualified `<kind>/<slug>` identity and the bare slug. Exact qualified wins,
 * a bare id resolves only when unique, and stale/ambiguous ids are pruned.
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

describe('matchSavedEntry', () => {
  it('prefers the exact qualified match', () => {
    expect(matchSavedEntry('lesson/shared', entries)?.qualifiedId).toBe('lesson/shared');
    expect(matchSavedEntry('concept/shared', entries)?.qualifiedId).toBe('concept/shared');
  });

  it('resolves a unique bare slug', () => {
    expect(matchSavedEntry('unique', entries)?.qualifiedId).toBe('formula/unique');
  });

  it('resolves nothing for an ambiguous bare slug', () => {
    expect(matchSavedEntry('shared', entries)).toBeUndefined();
  });

  it('resolves nothing for a stale id', () => {
    expect(matchSavedEntry('lesson/gone', entries)).toBeUndefined();
    expect(matchSavedEntry('gone', entries)).toBeUndefined();
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
