# Plan 026: Resolve detail routes and typed cross-links by qualified identity

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- src/lib/content.ts src/lib/resolve.ts src/pages/lessons/'[slug].astro' src/pages/concepts/'[slug].astro' src/pages/formulas/'[slug].astro' src/pages/examples/'[slug].astro' src/pages/practice/'[slug].astro' src/pages/glossary/'[slug].astro' src/components/layout/SectionIndex.astro src/layouts/CourseLayout.astro tests/unit/content.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (S per route; one coherent change)
- **Risk**: LOW (exact identity lookup; existing unique references still resolve)
- **Depends on**: none
- **Category**: bug + tech-debt
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

The content contract guarantees a globally unique identity, `qualifiedId` =
`<kind>/<slug>`, because slugs are only unique **within** a collection. The
validator deliberately allows the same slug in two collections (it warns, not
errors) and the resolver has an explicit ambiguity branch. But every detail
route looks entries up by bare `id` over the mixed `getAllEntries()` list:

- `/formulas/<slug>` can render the **concept** with the same slug, because
  `getAllEntries()` sorts lessons before concepts before formulas and
  `all.find((e) => e.id === formula.id)` returns the first match.
- `prev`/`next` can point out of the wrong position in the reading order.
- A lesson’s typed `formulas: [x]` / `concepts: [x]` references are resolved
  without their field’s kind, so a legal cross-collection slug collision makes
  the build fail as “ambiguous” even though the field names the kind.

The current sample has no collision, so nothing is red today. The failure is
latent but is exactly the content shape the contract says is legal. This plan
makes routes and typed references honor the identity the rest of the system
already uses.

## Current state

The five detail routes contain the same pattern (line numbers are the same in
each file; shown here for lessons, `src/pages/lessons/[slug].astro:6–22`):

```astro
export async function getStaticPaths() {
  const lessons = await getCollection('lesson', ({ data }) => data.draft !== true);
  const all = await getAllEntries();
  const sections = await getSectionGroups();

  return lessons.map((lesson) => {
    const index = all.findIndex((e) => e.id === lesson.id);
    return {
      params: { slug: lesson.id },
      props: {
        entry: all.find((e) => e.id === lesson.id)!,
        sections,
        prev: index > 0 ? all[index - 1] : undefined,
        next: index < all.length - 1 ? all[index + 1] : undefined,
      },
    };
  });
}
```

Identical code lives in:

- `src/pages/concepts/[slug].astro:6–22`
- `src/pages/formulas/[slug].astro:6–22`
- `src/pages/examples/[slug].astro:6–22`
- `src/pages/practice/[slug].astro:6–22`

`getAllEntries()` sorts by section order, then kind (`lesson: 0`, `concept: 1`,
`formula: 2`, `example: 3`, `question: 4`, `glossary: 5`), then `order` —
`src/lib/content.ts:138–146`. So the first bare-id match is frequently the
wrong kind.

`getCrossLinks()` merges the typed reference lists before resolving
(`src/lib/content.ts:252–279`):

```ts
const referenced = [
  ...((data.formulas as string[] | undefined) ?? []),
  ...((data.concepts as string[] | undefined) ?? []),
  ...(data.formula !== undefined ? [data.formula as string] : []),
];
...
const resolve = async (ids: string[], preferKind?: EntryKind) => { ... };
...
resolve(referenced),   // no preferKind
```

`resolveInList` already implements the correct rule
(`src/lib/resolve.ts:39–56`): a qualified reference matches kind + id; a bare
reference prefers the caller’s kind, then a globally unique match, and returns
`undefined` when ambiguous. The typed lists should pass their kind.

The glossary route duplicates the projection logic instead of using the
shared one (`src/pages/glossary/[slug].astro:33–49`), and the sidebar highlights
by bare id (`src/components/layout/SectionIndex.astro:36`, fed by
`src/layouts/CourseLayout.astro:143`).

Test pattern to extend: `tests/unit/content.test.ts` already builds
`Minimal` fixtures with `lesson/shared` and `concept/shared` and imports the
real helpers from `src/lib/resolve.ts` (lines 41–51, 53–85).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Unit tests | `npm run test` | all pass, including new cases |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Built output | `npm run test:dist` | all pass |
| Lint | `npm run lint` | exit 0 |
| Full gate | `npm run ci` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/lib/resolve.ts` (add the identity-index helper)
- `src/lib/content.ts` (`getCrossLinks` typed resolution)
- `src/pages/lessons/[slug].astro`
- `src/pages/concepts/[slug].astro`
- `src/pages/formulas/[slug].astro`
- `src/pages/examples/[slug].astro`
- `src/pages/practice/[slug].astro`
- `src/pages/glossary/[slug].astro`
- `src/components/layout/SectionIndex.astro`
- `src/layouts/CourseLayout.astro`
- `tests/unit/content.test.ts`

**Out of scope** (do NOT touch):
- Content files under `src/content/**` — no sample collision should be added to
  prove this; the unit test uses fixtures.
- `src/lib/content.ts`’s sorting, search index, related scoring, or schema.
- Page copy, layout markup, styles, or design tokens.
- The validator (`scripts/validate-content.mjs`) — it already reports the
  duplicate-slug warning; this plan does not change its policy.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`. If delivery is requested, keep the helper, route
updates, and tests in one logical commit.

## Steps

### Step 1: Add one identity-based index helper to `src/lib/resolve.ts`

Add next to the existing helpers:

```ts
/**
 * Index of the entry with this exact qualified identity (`<kind>/<slug>`).
 *
 * Routes must not use a bare-id scan over the mixed entry list: slugs are only
 * unique per collection, so the first bare match can be a different kind.
 * Returns -1 when the identity is absent.
 */
export function findEntryIndex<T extends Pick<CourseEntry, 'qualifiedId'>>(
  entries: T[],
  qualifiedId: string,
): number {
  return entries.findIndex((entry) => entry.qualifiedId === qualifiedId);
}
```

Keep the module’s existing type-only import of `CourseEntry`; do not add a
value import from `content.ts` (that would break the vitest seam).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Update all five detail routes

In each route, replace the two bare-id scans with one qualified lookup and
reuse the resolved entry for `params` and props. Example for lessons:

```astro
import { findEntryIndex } from '../../lib/resolve';

export async function getStaticPaths() {
  const lessons = await getCollection('lesson', ({ data }) => data.draft !== true);
  const all = await getAllEntries();
  const sections = await getSectionGroups();

  return lessons.map((lesson) => {
    const index = findEntryIndex(all, `lesson/${lesson.id}`);
    if (index === -1) {
      throw new Error(`lesson/${lesson.id} is missing from the content index`);
    }
    return {
      params: { slug: lesson.id },
      props: {
        entry: all[index],
        sections,
        prev: index > 0 ? all[index - 1] : undefined,
        next: index < all.length - 1 ? all[index + 1] : undefined,
      },
    };
  });
}
```

Repeat with the matching kind string:
`concept/${concept.id}`, `formula/${formula.id}`,
`example/${example.id}`, `question/${question.id}`.

Do not change `params.slug` — URLs remain `<kind>/<bare-id>`.

**Verify**: `npm run build` → exit 0. Record the number of built HTML pages
before and after (`find dist -name '*.html' | wc -l`); it must not change.

### Step 3: Resolve typed cross-links with their kind

Replace the merged `referenced` list in `getCrossLinks()` with per-field
resolution. Keep the existing `resolve` helper and the `unresolved` collection,
and move the `const unresolved` / `const resolve` declarations **above** the
`Promise.all` that uses them (the current code defines them after the merged
list).

Target shape:

```ts
const data = entry.entry.data as Record<string, unknown>;

const [formulaLinks, conceptLinks, formulaFieldLinks, prerequisites, dependents] =
  await Promise.all([
    resolve((data.formulas as string[] | undefined) ?? [], 'formula'),
    resolve((data.concepts as string[] | undefined) ?? [], 'concept'),
    resolve(data.formula !== undefined ? [data.formula as string] : [], 'formula'),
    resolve(entry.prerequisites),
    getDependents(entry.qualifiedId),
  ]);

const linked = [...formulaLinks, ...conceptLinks, ...formulaFieldLinks].filter(
  (candidate, index, list) =>
    list.findIndex((other) => other.qualifiedId === candidate.qualifiedId) === index,
);
```

Then return `formulas: linked.filter((e) => e.kind === 'formula')`,
`concepts: linked.filter((e) => e.kind === 'concept')`, and the existing
`prerequisites` / `dependents` / `unresolved` fields. The `unresolved` error
message must remain unchanged.

**Verify**: `npm run build` → exit 0. Check one lesson page still shows its
“فرمول‌های مرتبط” and “مفاهیم مرتبط” rails with the same titles as before
(`grep` the built HTML for the expected formula/concept titles). If a rail
disappears, STOP.

### Step 4: Highlight the active sidebar entry by qualified identity

- In `src/components/layout/SectionIndex.astro`, rename the prop
  `currentId?: string` to `currentQualifiedId?: string`, destructure it, and
  compare `entry.qualifiedId === currentQualifiedId`.
- In `src/layouts/CourseLayout.astro:143`, pass
  `currentQualifiedId={entry?.qualifiedId}`.

**Verify**: `npm run typecheck` → exit 0.
`grep -n "currentId" src/components/layout/SectionIndex.astro src/layouts/CourseLayout.astro`
→ no matches.

### Step 5: Make the glossary route use the shared projection

In `src/pages/glossary/[slug].astro`:

- Replace the local `projected` object (lines ~33–49) with the shared entry
  from `getAllEntries()`:
  ```ts
  const all = await getAllEntries();
  const index = findEntryIndex(all, `glossary/${entry.id}`);
  if (index === -1) throw new Error(`glossary/${entry.id} is missing from the content index`);
  const projected = all[index];
  ```
- Keep `entry` (the raw `CollectionEntry<'glossary'>`) only if it is still
  needed for `params`; otherwise use `projected`.
- Replace the local `noLinks` constant with `const crossLinks = await getCrossLinks(projected);`
  (glossary entries have no reference fields, so this returns empty arrays and
  does not throw).
- Remove the now-unused `CollectionEntry` / `CrossLinks` imports and the
  `normalized: ''` manual field. Do not change the page’s visible output or
  add prev/next navigation to glossary pages.

**Verify**: `npm run build` → exit 0; `/glossary/composite-function/` still
contains its term and definition in the built HTML.

### Step 6: Add the regression test

In `tests/unit/content.test.ts`, import `findEntryIndex` from
`../../src/lib/resolve.ts` and add:

```ts
describe('findEntryIndex (qualified identity)', () => {
  it('selects the requested kind when a bare slug collides', () => {
    expect(findEntryIndex(entries, 'lesson/shared')).toBe(0);
    expect(findEntryIndex(entries, 'concept/shared')).toBe(1);
  });

  it('returns -1 for an absent qualified identity', () => {
    expect(findEntryIndex(entries, 'formula/shared')).toBe(-1);
    expect(findEntryIndex(entries, 'lesson/unique')).toBe(-1);
  });
});
```

The fixtures at `tests/unit/content.test.ts:41–51` already contain
`lesson/shared` at index 0 and `concept/shared` at index 1. If the fixture
order changes, update the expected indexes to the actual positions — do not
weaken the assertion to “some index”.

**Verify**: `npm run test` → all pass, including 2 new cases.

## Test plan

- New unit cases in `tests/unit/content.test.ts` for `findEntryIndex`, using
  the existing colliding fixtures. Red-before-green: the helper does not exist
  before Step 1, and a bare-id implementation would return index 0 for both
  `lesson/shared` and `concept/shared`.
- Existing `resolveInList` cases (ambiguous bare slug resolves to nothing,
  qualified hit resolves) stay green.
- No new output snapshot: the sample content has no collision, so a browser/
  output test cannot exercise the bug without inventing content. The unit test
  is the faithful layer.
- Build proof: `npm run build` + `npm run test:dist` green, page count
  unchanged.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run test` exits 0 and includes the two `findEntryIndex` cases
- [ ] `npm run build` exits 0; built HTML page count is unchanged vs before
- [ ] `npm run test:dist` exits 0
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] `grep -rn "e.id === lesson.id\|e.id === concept.id\|e.id === formula.id\|e.id === example.id\|e.id === question.id" src/pages` returns no matches
- [ ] `grep -n "currentId" src/components/layout/SectionIndex.astro src/layouts/CourseLayout.astro` returns no matches
- [ ] `grep -n "noLinks\|const projected: CourseEntry" src/pages/glossary/[slug].astro` returns no matches
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `getAllEntries()` and `getCollection(kind)` disagree about which entries
  exist (for example draft filtering differs), so a route path cannot find its
  qualified entry. Report the counts instead of inventing a fallback.
- `getCrossLinks()` on a glossary entry throws or changes the glossary page’s
  rendered content; glossary entries have no reference fields, so this
  indicates a projection mismatch — report it.
- The built HTML page count changes, or a lesson loses a cross-link rail after
  Step 3. Compare the specific titles before/after and report.
- Astro/TypeScript rejects the `findStaticPaths` helper import or the route
  prop type. Report the exact diagnostic; do not duplicate the helper back
  into each route.

## Maintenance notes

- New content kinds must be added to `URL_BY_KIND`, `kindOrder`, and each
  detail route’s `findEntryIndex` call. The contract is one identity lookup per
  route, never a bare-id scan.
- Typed frontmatter fields must pass their kind to `resolve()`; if a new
  reference field is added, add it to the matching `resolve` call, not the
  merged list.
- The validator still warns (not errors) on duplicate slugs across collections.
  That is intentional: this plan makes the legal collision resolve correctly.
- `getRelatedEntries` remains a separate scoring path; it already uses
  `qualifiedId` and `prereqMatches`.
