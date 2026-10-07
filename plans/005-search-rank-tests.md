# Plan 005: Extract and pin search ranking with unit tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/islands/common/SearchIsland.tsx src/lib/utils.ts tests/unit`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but plan 010 framework upgrades require this plan first)
- **Category**: tests
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

"Look up a formula by search" is must-have flow #3 (`docs/PRODUCT.md`), and
its Persian-specific ranking lives in one untested function: title-prefix (12)
> title-substring (8) > tag (5) > body word/beginning (4/2), with
every-term-must-match. `normalizePersian`/`tokenize` are pinned by
`tests/unit/utils.test.ts`, but the ranking itself is only exercised manually
in a browser. A one-line slip (e.g. weakening the `return 0`) silently
degrades the core lookup flow with green CI. Extracting it pure and pinning it
also gives plan 010 a safety net before the React 19 jump.

## Current state

- `src/islands/common/SearchIsland.tsx` lines ~42–60: module-private
  `function score(item, normalized, terms)`:
  - `title = normalizePersian(item.title)`; `haystack` from
    `normalized._norm ?? normalizePersian(...)` (line 44);
  - per term: prefix +12 / substring +8; tag-substring +5;
    `haystack.includes(' '+term)` +4 else includes +2, else `return 0`
    (line 55, "every term must match somewhere").
- `normalizedItems` memo (line ~68) precomputes `_norm` per item.
- `src/lib/utils.ts`: `normalizePersian` (Arabic/Persian unification,
  digit conversion, diacritic stripping) — the oracle the tests must use
  INSTEAD of reimplementing normalization.
- Test pattern to follow: `tests/unit/template-slice.test.ts` imports pure
  lib functions (`gradeChoice`, …) and asserts behavior boundaries with
  Persian fixtures.
- Island header comment documents the scoring contract — keep behavior
  identical; this plan moves code, it does not retune weights.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0, no errors |
| Unit tests | `npm run test` (`vitest run tests/unit`) | all pass, incl. new file |
| Lint      | `npm run lint` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/lib/search-rank.ts` (create — pure ranking module)
- `src/islands/common/SearchIsland.tsx` (import the extracted function; no behavior change)
- `tests/unit/search-rank.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- Scoring weights or ordering — any retune is a product decision, not this plan.
- `src/lib/content.ts` `buildSearchIndex` — index shape is unchanged.
- Styles, copy, or island state logic.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit: extract → tests → wire-up, or tests-first if you prefer; each commit green.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract `score` verbatim into `src/lib/search-rank.ts`

Create the module exporting the ranking pure function with the EXACT current
logic (same weights, same `return 0` rule, same `_norm` fallback). Types:
accept the minimal structural item (`title`, `excerpt?`, `tags?`,
`_norm?`) so tests need no `SearchableItem` fixtures — but keep it compatible
with `SearchableItem`. Import `normalizePersian` from `./utils` (same as the
island does). No JSDoc novel — one line referencing the island contract.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Write the ranking tests (red-first)

Create `tests/unit/search-rank.test.ts` modeled on `template-slice.test.ts`,
using REAL Persian fixtures (e.g. title `قاعده زنجیره‌ای`, tag `مشتق`).
Cases (each asserts via the real `normalizePersian`, never a copy of the
weights):
1. title-prefix outranks title-substring (same term, two items);
2. tag match beats body-only match;
3. multi-term query where one term matches nothing scores 0 / is excluded;
4. Arabic-keyboard variant (`كتاب` vs `کتاب`) matches identically;
5. empty/blank terms yield no score (defensive boundary).

**Verify**: run `npx vitest run tests/unit/search-rank.test.ts` → all pass;
then temporarily change one weight in `search-rank.ts` and confirm at least
one test FAILS (defect sensitivity), then restore. Record both outcomes.

### Step 3: Rewire the island without behavior change

Replace the island's private `score` with an import from
`../../lib/search-rank` (path depth: island is at
`src/islands/common/`, lib at `src/lib/`). Delete the local copy. The call
site (`normalizedItems.map(...)`) keeps passing `(item, item, terms)`.

**Verify**: `npm run typecheck` → 0; `npm run lint` → 0; `npm run test` →
all pass (67 existing + new). `git diff --stat` on the island shows only the
import swap + deleted local function.

## Test plan

- New `tests/unit/search-rank.test.ts` (5 cases above) + the temporary-weight
  mutation check as red-before-green evidence.
- Existing nets: full unit suite; typecheck proves the island still compiles
  against the moved signature.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0 with the new test file present and passing
- [ ] The temporary weight mutation was observed to fail (evidence noted in the commit message or plan row)
- [ ] Search result ORDER for a fixed sample query is unchanged vs pre-extract (no weight/logic edits in the diff)
- [ ] Only the three in-scope files are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `score` in the live island differs from the excerpt (weights/rule changed) — the test expectations would pin the wrong contract.
- The island's `score` closes over component state (not pure) — extraction as specified is unsafe; report instead.
- Wiring the import requires touching `src/lib/content.ts` or the index shape — out of scope; stop.

## Maintenance notes

- Any future weight retune must update these tests FIRST (they pin the
  contract) and justify the product reason in the commit.
- Reviewers: diff the extracted function against the deleted island copy —
  it must be identical logic, only relocated.
- Deferred: performance work on ranking (worker/memoization) — explicitly not
  this plan; see the search-scale direction spike (plan 012).
