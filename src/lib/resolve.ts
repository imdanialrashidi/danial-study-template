import type { CourseEntry, EntryKind } from './content.ts';

/**
 * Pure link-resolution branches shared by the engine and its tests.
 *
 * `content.ts` cannot be imported under vitest (it value-imports
 * `astro:content` for the collection layer), so the pure branches live here —
 * importable anywhere with `import type` only. `content.ts` delegates to these
 * helpers; behavior is identical, and the unit tests assert on these real
 * functions rather than on copies.
 *
 * The helpers are generic over `Pick<CourseEntry, …>` subsets so every entry
 * shape reuses one rule: the build side passes `CourseEntry`, the validator
 * script projects its file rows, and the saved-list island passes its
 * client-safe entries. An ambiguous bare slug resolves to nothing in all
 * three — surfaced as a build error, or pruned from the saved list, rather
 * than linking wrongly.
 */

/**
 * Strict reference parser.
 *
 * Returns the `[kind, id]` pair for `<kind>/<slug>`, `[undefined, slug]` for
 * a bare slug, or `undefined` when the reference is malformed (`a/b/c`,
 * empty segments like `lesson/` or `/x`).
 */
export function parseReference(reference: string): [string | undefined, string] | undefined {
  const parts = reference.split('/');
  if (parts.length > 2 || (reference.includes('/') && parts.some((p) => !p))) return undefined;
  return parts.length === 2 ? [parts[0], parts[1]] : [undefined, parts[0]];
}

/**
 * Resolve a reference against an explicit entry list.
 *
 * Bare `<slug>` prefers `preferKind`, then falls back to a globally unique
 * match; an ambiguous bare slug resolves to nothing (callers surface that as
 * a build error rather than linking wrongly). Qualified `<kind>/<slug>`
 * resolves exactly or not at all.
 */
export function resolveInList<T extends Pick<CourseEntry, 'id' | 'kind'>>(
  entries: T[],
  reference: string,
  preferKind?: EntryKind,
): T | undefined {
  const parsed = parseReference(reference);
  if (!parsed) return undefined;
  const [maybeKind, maybeId] = parsed;
  if (maybeKind && maybeId) {
    return entries.find((e) => e.kind === maybeKind && e.id === maybeId);
  }
  const sameKind = preferKind ? entries.filter((e) => e.kind === preferKind && e.id === maybeId) : [];
  if (sameKind.length === 1) return sameKind[0];
  const matches = entries.filter((e) => e.id === maybeId);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * Prerequisite identity matcher: a declared prerequisite
 * matches either the qualified `<kind>/<slug>` identity or the bare slug.
 */
export function prereqMatches(list: string[], entry: Pick<CourseEntry, 'id' | 'qualifiedId'>): boolean {
  return list.includes(entry.qualifiedId) || list.includes(entry.id);
}

/**
 * Entries of an explicit list that declare `qualifiedId` as a prerequisite,
 * accepting bare-slug declarations too.
 */
export function dependentsInList<T extends Pick<CourseEntry, 'id' | 'qualifiedId' | 'kind' | 'prerequisites'>>(
  entries: T[],
  qualifiedId: string,
): T[] {
  const target = entries.find((e) => e.qualifiedId === qualifiedId);
  const id = target?.id ?? qualifiedId.split('/').pop() ?? qualifiedId;
  const probe = { qualifiedId, id };
  return entries.filter((e) => prereqMatches(e.prerequisites, probe));
}

/**
 * Resolve stored bookmark ids to rows in course order, dropping stale or
 * ambiguous ids silently and deduping entries bookmarked under both forms.
 *
 * A bare stored id shared by two kinds resolves to nothing (via
 * `resolveInList`) rather than attaching to either entry — the same rule
 * that keeps a bare reference from linking wrongly at build time. The
 * returned `bookmark` is the exact stored id, kept for removal.
 */
export function resolveSavedRows<T extends Pick<CourseEntry, 'id' | 'qualifiedId' | 'kind'>>(
  bookmarks: string[],
  entries: T[],
): { bookmark: string; entry: T }[] {
  const rows: { bookmark: string; entry: T }[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const bookmark = bookmarks.find((b) => b === entry.qualifiedId || b === entry.id);
    if (bookmark === undefined) continue;
    if (resolveInList(entries, bookmark) !== entry) continue;
    if (seen.has(entry.qualifiedId)) continue;
    seen.add(entry.qualifiedId);
    rows.push({ bookmark, entry });
  }
  return rows;
}
