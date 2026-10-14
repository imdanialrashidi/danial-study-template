# Plan 021: Unify the forked search scorers behind one tested function

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/islands/common/SearchIsland.tsx src/islands/common/CommandPalette.tsx src/lib/utils.ts tests/unit`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (ranking is user-visible; weight table stays parameterized so
  behavior is pinned before converging)
- **Depends on**: plans/005-search-rank-tests.md SHOULD be landed first
  (it pins `SearchIsland` weights; this plan converges the palette onto the
  pinned contract). If 005 is unlanded, do Step 1 first (pin current
  SearchIsland behavior verbatim), then converge.
- **Category**: tech-debt
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

The same query ranks differently in page search vs. command palette, the
palette recomputes `normalizePersian` per item per keystroke with no `_norm`
cache, and a relevance fix must be made twice — the two scorers have already
diverged (12/8/5/4/2 vs 10/6/2, limit 40 vs 8). Must-have flow #3 (look up a
formula by search) deserves one oracle, not two forks.

## Current state

- `SearchIsland.tsx:42-59` `score(item, normalized, terms)`: title-prefix +12
  / substring +8; tag-substring +5; body word-start +4 / substring +2, else
  `return 0` (every term must match). Precomputed `_norm` (`:67-69`), limit 40
  (check exact slice at `:72-84`).
- `CommandPalette.tsx:46-65`: inline scorer — title-prefix +10 / substring +6
  / body +2, else 0; recomputes `normalizePersian(...)` per item per keystroke
  (`:52,55-56`); limit 8 (`:64`); no `_norm` cache.
- Shared oracle: `normalizePersian` (`utils.ts:35-52`); tokens via
  `query.split(/\s+/)` in both.
- Test pattern: `tests/unit/template-slice.test.ts`; plan 005's extraction
  (if landed) is the base to extend — read it first.
- Out of scope but adjacent: per-page index embedding (plan 024 owns payload/
  hydration); this plan unifies scoring only, keeping both call sites' limits.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass, incl. new tests |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/search.ts` (create — `scoreSearchItem` + `normalizeIndexEntry`)
- `src/islands/common/SearchIsland.tsx` (call the shared scorer; keep limit)
- `src/islands/common/CommandPalette.tsx` (call the shared scorer; keep limit)
- `tests/unit/search.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):
- Weight retuning — converge ON the pinned `SearchIsland` weights (the
  better-tested contract); any retune is a separate product decision.
- Slice limits (40 vs 8) — call-site parameters, unchanged.
- Index payload size / `client:idle` hydration (plan 024).
- `src/lib/content.ts` related-scoring (`+3/+2/+2`) — different surface.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Pin current `SearchIsland` behavior verbatim

If plan 005 landed, read its extracted scorer + tests and skip to Step 2.
Otherwise: create `src/lib/search.ts` with `scoreSearchItem(item, norm,
terms, weights)` defaulting to the SearchIsland weight table
(prefix 12 / substring 8 / tag 5 / word 4 / substring 2, every-term-must-match),
plus `normalizeIndexEntry(item)` returning the `_norm` string. Write
`tests/unit/search.test.ts` pinning: prefix > substring > tag > body ordering,
every-term-must-match elimination, tag-only match scoring, empty-terms
behavior. Persian fixtures (e.g. «مشتق», «حد») mirroring real sample titles.

**Verify**: `npm run test` → all pass including the new file.

### Step 2: Converge both islands onto the shared scorer

- `SearchIsland.tsx`: replace the private `score()` body with a call to
  `scoreSearchItem` (same weights constant); keep `_norm` memo + limit 40.
- `CommandPalette.tsx`: replace the inline scorer (`:46-65`) with
  `scoreSearchItem` + precomputed norms (add the `_norm` memo — this also
  fixes the per-keystroke recompute); keep limit 8.
- Weights as an explicit parameter with the SearchIsland table as default, so
  a future retune is a data change with test pins, not a second fork.

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass.
Behavior check: identical queries return identical relative order in both
surfaces (assert in the new test file with a shared fixture list).

### Step 3: Gates + interaction evidence

**Verify**: `npm run validate` → green; `npm run lint` → exit 0. If a preview
environment is available, run `interaction-qa.mjs` (search + palette journeys)
and record PASS; otherwise note NOT EXECUTED in the plan row.

## Test plan

- New `tests/unit/search.test.ts`: ordering pins, every-term elimination,
  tag/body tiers, cross-surface order agreement, `_norm` equivalence with
  inline normalization.
- Red proof: temporarily swap one weight (e.g. prefix 12→2) and confirm the
  ordering test FAILS (then restore).
- Existing suites unchanged and green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0; `tests/unit/search.test.ts` exists and passes
      with red proof performed
- [ ] `npm run validate`, `npm run lint` exit 0
- [ ] `grep -n "score += 10\|score += 6" src/islands/common/CommandPalette.tsx`
      returns no matches (fork converged)
- [ ] `grep -n "normalizePersian(" src/islands/common/CommandPalette.tsx`
      shows no per-item-per-keystroke recompute (memoized `_norm` in use)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Plan 005 landed with a *different* weight contract than quoted here — adopt
  the landed contract (it is the pinned oracle) and note the delta.
- Converging changes any existing passing test's expectation (ranking
  regression — report the query/fixture rather than updating the test
  silently).
- Palette-specific behavior (empty-query top-8, `active` index handling)
  entangles with scoring — keep that logic in the island; report if
  inseparable.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future relevance work touches `src/lib/search.ts` weights + tests only —
  reviewers: reject scorer logic reappearing in islands.
- Plan 024 (payload/hydration) will move *what* is scored; this plan owns
  *how* — keep the boundary.
- `normalizePersian` remains the single text oracle; do not add a second
  normalizer for search.
