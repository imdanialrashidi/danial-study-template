# Plan 013: Fix prerequisite identity matching and strict reference parsing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/lib/content.ts scripts/validate-content.mjs src/content.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

The dependents rail on every content page is always empty and the related-entries
`+2` prerequisite bonus never fires, with no error anywhere. Prerequisites are
stored as bare slugs (`prerequisites: [limit]`, the only form the Zod schema
allows) but `getDependents` and `getRelatedEntries` compare them against
`qualifiedId` (`concept/limit`). Lesson pages silently lose backlink navigation.
Separately, `a/b/c` references silently truncate to `a/b` in both runtime and
validator, so a typo links to the wrong entry instead of failing loudly.

## Current state

- `src/lib/content.ts` — projection stores raw frontmatter (`:120`):
  `prerequisites: (data.prerequisites as string[] | undefined) ?? []`
- `src/lib/content.ts:200-216` `resolveEntry`: `const [maybeKind, maybeId] =
  reference.includes('/') ? reference.split('/') : [undefined, reference];` —
  a third segment is silently dropped.
- `src/lib/content.ts:218-221`: `getDependents(qualifiedId)` filters
  `e.prerequisites.includes(qualifiedId)` — bare slugs never match.
- `src/lib/content.ts:250`: related bonus `candidate.prerequisites.includes(
  entry.qualifiedId) || entry.prerequisites.includes(candidate.qualifiedId)` —
  same mismatch, bonus dead.
- `src/lib/content.ts:436-446` `resolveSync` mirrors the truncating split.
- `scripts/validate-content.mjs:168-178` `matchesRef` has the same shape:
  `const [kind, id] = ref.split('/')`.
- `src/content.config.ts:37-38`: `PREREQUISITES = z.array(SLUG)` — SLUG regex
  disallows `/`, so stored values are always bare slugs.
- Sample: `src/content/concepts/derivative.mdx:10` `prerequisites: [limit]`;
  `src/content/formulas/chain-rule.mdx:10` `prerequisites: [derivative]`.
- Repo conventions: fail-fast on malformed content; Persian UI copy for errors
  (see `collectLinkProblems` messages in `content.ts:386-434`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/content.ts`
- `scripts/validate-content.mjs`

**Out of scope** (do NOT touch, even though they look related):
- `src/content.config.ts` — the bare-slug schema is correct; the fix is at comparison time.
- Any `.mdx` content — no authoring changes needed.
- `src/lib/utils.ts`, search scoring, plan 005 territory.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a shared prerequisite matcher and use it in both call sites

In `src/lib/content.ts`, add a module-private helper next to `getDependents`:

```ts
function prereqMatches(list: string[], entry: CourseEntry): boolean {
  return list.includes(entry.qualifiedId) || list.includes(entry.id);
}
```

Use it in `getDependents` (`:219-220`): `filter((e) =>
prereqMatches(e.prerequisites, { qualifiedId, id } ))` — i.e. compare against
both the qualified id and the bare slug of the target entry. Use it for both
directions of the `:250` related bonus. Bare-slug matching can over-match when
two kinds share a slug; that is acceptable here because the validator
(`validate-content.mjs:153-162`) already warns on shared slugs and tells authors
to qualify, and over-matching only affects a bonus score and a rail, never a
hard link.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Reject multi-slash references in all three resolvers

In `resolveEntry` (`content.ts:205`), `resolveSync` (`:437-441`), and
`matchesRef` (`validate-content.mjs:169-171`), replace the destructuring split
with a strict parse: split on `/`; if more than 2 segments, or kind/id is
empty, treat as unresolved (return `undefined` / no match). No valid reference
contains two slashes per the schema regexes (`content.config.ts:65-71`).

**Verify**: `npm run validate` → `No content errors found.`
Then manually probe: temporarily add `prerequisites: [concept/a/b]` to one
sample entry, run `npm run validate`, confirm it reports an unresolved
reference (then revert). This is the red proof for the strict parse.

### Step 3: Snapshot dependents before/after

Run `npm run build`, then check that the built `derivative` concept page (or
equivalent) now renders a dependents rail entry pointing at it (e.g.
`chain-rule` lists `derivative` as prerequisite). Before this fix the rail was
empty; after, it is non-empty. Inspect one built HTML file with `grep`.

**Verify**: `npm run test` → all pass; `npm run lint` → exit 0.

## Test plan

- No new test file in this plan (unit coverage for resolution lands in plan
  016, which pins `resolveEntry` branches, dependents-bare-slug, and
  multi-slash rejection).
- The Step 2 temporary-mutation probe is the defect-sensitivity evidence.
- Existing nets unchanged: unit suite + validator must stay green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run validate` exits 0 with `No content errors found.`
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "prerequisites.includes" src/lib/content.ts` shows no remaining
      bare `includes(qualifiedId)` comparisons (only the new helper)
- [ ] Built output contains a non-empty dependents rail on an entry that has
      dependents (verified by grep in Step 3)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  (the codebase has drifted since this plan was written).
- `npm run validate` reports errors on unmodified sample content after Step 1
  (the matcher changed resolution semantics beyond prerequisites).
- Any existing content relies on a multi-slash reference resolving (grep
  `a/b/c`-shaped refs in `src/content/`) — report the file instead of
  rewriting it.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- If a future schema allows qualified prerequisites (`kind/slug`), the bare
  branch of `prereqMatches` becomes redundant but harmless; remove it only when
  the validator enforces qualification.
- Reviewer: confirm the over-match tradeoff (bare slug shared across kinds)
  is acceptable vs. the alternative of normalizing at `project()` time.
- Deferred to plan 016: unit tests pinning all of this behavior.
