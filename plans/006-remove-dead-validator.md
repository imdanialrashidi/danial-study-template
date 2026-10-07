# Plan 006: Remove the dead `collectLinkProblems` validator

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/content.ts src/lib/render.ts scripts/validate-content.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

`src/lib/content.ts` exports `collectLinkProblems`, which has zero callers —
the real gate is `scripts/validate-content.mjs`. Worse, its fragment check
tests `body.Content.toString()`, which serializes an Astro component function,
not rendered HTML, so EVERY `#fragment` reference would be falsely reported
missing if anyone ever called it. It also `await renderContent(...)` inside a
per-reference loop. Dead + wrong + slow-looking code misleads the next reader
into trusting or calling it. Delete it.

## Current state

- `src/lib/content.ts:386-431`: `export async function collectLinkProblems(...)`
  plus the `LinkProblem` interface just above (~lines 378–385). Fragment branch
  (lines 419–420):
  ```
  const body = await renderContent(resolved.entry);
  if (body && !new RegExp(`id=["']${fragment}["']`).test(body.Content.toString())) {
  ```
  `renderContent` (`src/lib/render.ts`) returns Astro's `render(entry)` whose
  `Content` is a component — `.toString()` yields function source, never page
  HTML, so the regex can never match a real `id="..."`.
- Repo-wide grep for `collectLinkProblems` finds only its definition —
  no importers in `src/`, `scripts/`, or `tests/`. (Re-verify in Step 1; if a
  caller appeared, follow the escape hatch.)
- `src/lib/content.ts:5`: `import { renderContent } from './render'` — check
  whether anything else in the file uses it before removing.
- Docstring above `getCrossLinks`/`resolveEntry` describes the LIVE reference
  model; nothing references `collectLinkProblems`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npm run test` | all pass |
| Lint      | `npm run lint` | exit 0 (catches now-unused imports) |
| Validate  | `npm run validate` | `No content errors found.` |

## Scope

**In scope** (the only files you should modify):
- `src/lib/content.ts` (delete function + interface + orphaned import only)

**Out of scope** (do NOT touch, even though they look related):
- `scripts/validate-content.mjs` — the live gate; plan 003 owns its fixes.
- `src/lib/render.ts`, `resolveEntry`/`resolveSync`, `getCrossLinks` — live code paths.
- Any test file (nothing tests the dead function; `No new test` is correct).

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Single commit; short imperative message.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove zero callers (read-only)

Run repo-wide exact search: `grep -rn "collectLinkProblems\|LinkProblem" --include="*.ts" --include="*.astro" --include="*.mjs" --include="*.tsx" src scripts tests`. Expect exactly two hits: the definition and the interface, both in `src/lib/content.ts`. Also grep `renderContent` in `src/lib/content.ts` to list its uses.

**Verify**: search output matches the expectation. If ANY caller exists outside `content.ts`, STOP and follow the escape hatch below.

### Step 2: Delete the dead code

Remove `collectLinkProblems` (lines ~386–431) and the `LinkProblem` interface
(~378–385). If Step 1 shows `renderContent` unused elsewhere in `content.ts`,
remove that import too; otherwise keep it. Do not reformat surrounding code.

**Verify**: `npm run typecheck` → exit 0; `npm run lint` → exit 0 (proves no
orphaned import/reference remains).

### Step 3: Run the gates

**Verify**: `npm run test` → all pass; `npm run validate` → `No content errors found.`

## Test plan

- No new test: deleting uncalled code adds no behavior; the defect-sensitivity
  argument is the Step 1 grep (nothing can observe the deletion except the
  compiler/linter, both run).
- Existing nets: typecheck + lint (reference integrity) + unit suite + validator.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "collectLinkProblems\|LinkProblem" src scripts tests` returns nothing
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate` all exit 0
- [ ] `git status` shows only `src/lib/content.ts` modified, and the diff is purely deletions
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds a caller (script, page, or test imports it) — do NOT delete. Escape hatch: fix the fragment branch instead (check the raw entry body for `id="..."` like `scripts/validate-content.mjs` does, not `Content.toString()`), add a unit test with a `#fragment` ref, and report the scope change.
- `renderContent` is used elsewhere in `content.ts` — keep the import (deletion-only diff for the rest).
- Lint or typecheck reveals the interface is re-exported/consumed via a barrel (`src/lib/index.ts`) — check `src/lib/index.ts` first; if re-exported, remove that line too, still in scope.

## Maintenance notes

- The live reference gate is `scripts/validate-content.mjs` + Zod schemas; say so in review if anyone proposes re-adding a TS-side validator.
- Reviewers: confirm the diff is deletions-only.
- No follow-up deferred.
