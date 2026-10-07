# Plan 007: Reset stale quiz best-scores when the quiz changes size

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/progress.ts tests/unit/progress.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

`ProgressStore.recordQuiz` keeps the highest raw score forever. When course
content adds (or removes) a question, the stored `total` goes stale: a
previous 3/4 blocks a new 4/5 (`4 >= 3` → keep), so the learner's record shows
the old denominator and the new best never persists. Comparing on equal
footing only when `total` matches fixes it with a three-line change.

## Current state

- `src/lib/progress.ts:171-176`:
  ```
  /** Keeps the highest score, so a retry can only improve the record. */
  recordQuiz(id: string, score: number, total: number): void {
    const previous = this.data.quizzes[id];
    if (previous && previous.score >= score) return;
  ```
  The guard compares `score` only; `total` is never considered, and the stored
  record keeps the old `total` on early-return.
- `QuizScore` (`progress.ts`): `{ score, total, completedAt }`.
- Test pattern: `tests/unit/progress.test.ts` already pins "keeps the highest"
  and "records an improved score" using an in-memory `MemoryStorage` +
  `__resetProgressStore()` harness — extend that file, same style.
- Callers: `ProgressBridge.recordQuiz` (islands) passes through; no caller
  depends on cross-total comparison (verify with grep in Step 1).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Unit tests | `npm run test` (`vitest run tests/unit`) | all pass, incl. 2 new cases |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint      | `npm run lint` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/lib/progress.ts` (the guard only)
- `tests/unit/progress.test.ts` (two new cases)

**Out of scope** (do NOT touch, even though they look related):
- `src/islands/common/Quiz.tsx` / `ProgressBridge` — pass-through; no change needed.
- Score-ratio or versioning schemes — over-engineering; `total`-change reset is the fix.
- Migration of existing stored payloads — old records self-heal on next attempt.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit: tests-first (failing) then fix, or fix+tests together — keep green at each commit.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm no caller depends on the old comparison

Grep `recordQuiz` across `src/` and `tests/`; confirm every caller passes the
current quiz's `(id, score, questions.length)` with no reliance on
cross-total retention.

**Verify**: caller list is pass-through only. If any caller compensates for
totals itself, STOP (the fix location may be wrong).

### Step 2: Add the two failing tests first

Append to `tests/unit/progress.test.ts`, reusing its `MemoryStorage` harness:
1. `recordQuiz('q', 3, 4)` then `recordQuiz('q', 4, 5)` → stored is
   `{score: 4, total: 5}` (changed quiz resets the record);
2. `recordQuiz('q', 3, 4)` then `recordQuiz('q', 2, 4)` → stored stays
   `{score: 3, total: 4}` (same-total best kept — existing behavior pinned).

**Verify**: `npx vitest run tests/unit/progress.test.ts` → case 1 FAILS on
current code (proving the bug), case 2 passes.

### Step 3: Fix the guard

Change the guard so a `total` change always stores the new result:
```ts
const previous = this.data.quizzes[id];
if (previous && previous.total === total && previous.score >= score) return;
```
(When `total` differs, fall through and overwrite — the old record measured a
different quiz.) Update the doc comment to say so in one line.

**Verify**: `npm run test` → all pass; `npm run typecheck` → 0;
`npm run lint` → 0.

## Test plan

- Two new cases in `tests/unit/progress.test.ts` (Step 2), with case 1 shown
  failing pre-fix (red-before-green evidence).
- Existing progress cases (idempotency, degradation, best-score) must stay green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] New stale-total test fails on pre-fix code (observed in Step 2) and passes post-fix
- [ ] `npm run test`, `npm run typecheck`, `npm run lint` all exit 0
- [ ] `git status` shows only the two in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 2 case 1 already passes (guard already total-aware upstream) — no fix needed.
- A caller normalizes totals before calling (Step 1) — the right fix may live there; report instead.
- Stored-payload migration turns out to be required (it isn't — records heal on next attempt; if evidence disagrees, stop).

## Maintenance notes

- If quizzes ever gain versioned ids, prefer keying records by quiz version
  over this `total` heuristic — revisit then.
- Reviewers: the only semantic change is "different total ⇒ overwrite"; same-total behavior is byte-identical.
- No follow-up deferred.
