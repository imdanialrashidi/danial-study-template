import type { CourseEntry, EntryKind } from './content.ts';

/**
 * Pure link-resolution branches shared by the engine and its tests.
 *
 * `content.ts` cannot be imported under vitest (it value-imports
 * `astro:content` for the collection layer), so the pure branches live here —
 * importable anywhere with `import type` only. `content.ts` delegates to these
 * helpers; behavior is identical, and the unit tests assert on these real
 * functions rather than on copies.
 */

/**
 * Strict reference parser (plan 013's multi-slash rejection).
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
export function resolveInList(
  entries: CourseEntry[],
  reference: string,
  preferKind?: EntryKind,
): CourseEntry | undefined {
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
 * Prerequisite identity matcher (plan 013's fix): a declared prerequisite
 * matches either the qualified `<kind>/<slug>` identity or the bare slug.
 */
export function prereqMatches(list: string[], entry: Pick<CourseEntry, 'id' | 'qualifiedId'>): boolean {
  return list.includes(entry.qualifiedId) || list.includes(entry.id);
}

/**
 * Entries of an explicit list that declare `qualifiedId` as a prerequisite,
 * accepting bare-slug declarations too.
 */
export function dependentsInList(entries: CourseEntry[], qualifiedId: string): CourseEntry[] {
  const target = entries.find((e) => e.qualifiedId === qualifiedId);
  const id = target?.id ?? qualifiedId.split('/').pop() ?? qualifiedId;
  const probe = { qualifiedId, id };
  return entries.filter((e) => prereqMatches(e.prerequisites, probe));
}
