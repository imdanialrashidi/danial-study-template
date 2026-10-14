# Plan 014: Scope Quiz radio groups and unify numeric grading dispatch

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/islands/common/Quiz.tsx src/lib/quiz.ts tests/unit/template-slice.test.ts`
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

Two quizzes on one page that reuse short question ids (`q1`, `q2` — the sample
convention in `practice-foundations.mdx`) share a single document-global radio
group: selecting in one deselects the other and both mis-score. Separately, the
two grading oracles disagree on odd shapes (`numericAnswer` + `options`, or
`type: 'numeric'` without an answer), and a question with no answer key at all
scores a blank answer as *correct* (`[].every(...) === true`). Malformed
authoring must fail closed, not award points.

## Current state

- `src/islands/common/Quiz.tsx:219`: choice input `name={`${question.id}`}` —
  document-global. The numeric input next to it (`:221`-area,
  `id={`${id}-${question.id}-numeric`}`) is already correctly scoped to the quiz
  instance `id` (prop `:14-15`: "Stable id used to store the best score").
- `src/lib/quiz.ts:10-21` `gradeChoice`: dispatches numeric on
  `question.numericAnswer !== undefined`; builds `expected` from
  `correctAnswer`, defaulting to `[]` when undefined — so
  `gradeChoice(q, [])` with no key returns `true`.
- `src/lib/quiz.ts:34-37` `isNumericQuestion`: dispatches on
  `type === 'numeric' || (numericAnswer !== undefined && options.length === 0)`
  — disagrees with `gradeChoice` on mixed shapes.
- `src/islands/common/Quiz.tsx:24-27` island `isCorrect` uses
  `isNumericQuestion`; `gradeQuiz` (`quiz.ts:39-41`) uses `gradeChoice` — the
  two oracles can disagree on one page.
- Existing pins: `tests/unit/template-slice.test.ts:47-95` covers happy-path
  choice/numeric/tolerance only; the `mcq`/`multi`/`numeric` fixtures live at
  `:17-45`.
- Repo conventions: Persian-digit input accepted at typing time
  (`Quiz.tsx:174` `toLatinDigits` on change); grading is the single oracle in
  `src/lib/quiz.ts` ("covered by unit tests, so a grading regression fails
  `npm run test`").

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass, incl. new cases |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/islands/common/Quiz.tsx`
- `src/lib/quiz.ts`
- `tests/unit/template-slice.test.ts` (extend with new cases)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/progress.ts` quiz-score storage (plan 015).
- `src/content.config.ts` question schema — no schema change; the guard is at grading time.
- Any `.mdx` content.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Scope the radio group name to the quiz instance

In `Quiz.tsx:219`, change `name={`${question.id}`}` to
``name={`${id}-${question.id}`}``, matching the numeric input convention. Pure
attribute rename; no grading logic change. Checkbox (`multi`) inputs share the
same `name` line — the same change covers them.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Unify numeric dispatch and reject keyless questions

In `src/lib/quiz.ts`:

1. Make `gradeChoice` delegate numeric detection to the single shared
   predicate: replace the `question.numericAnswer !== undefined` check (`:11`)
   with `isNumericQuestion(question)` (move `isNumericQuestion` above
   `gradeChoice` if needed for ordering).
2. After building `expected`, add: `if (expected.length === 0) return false;`
   — a question with no answer key scores nothing as correct, including blanks.
   Note `gradeNumeric` already returns `false` for empty/non-numeric input
   (`:26-29`), so numeric behavior is unchanged.

**Verify**: `npm run test` → all pass (existing cases must stay green; the
`isNumericQuestion` describe block at `template-slice.test.ts:82-88` pins
current detection behavior — update it only if the unification intentionally
changes a pinned case, and say so in the commit message).

### Step 3: Add regression cases

Extend `tests/unit/template-slice.test.ts` following the existing fixture
style (`mcq`, `multi`, `numeric` at `:17-45`):

- keyless question: `{ ...mcq, correctAnswer: undefined }` scores `[]` and
  `['a']` as `false`;
- mixed shape `numericAnswer` + `options`: `gradeChoice` and
  `isNumericQuestion` agree (choice path — `isNumericQuestion` requires
  `options.length === 0`, so both oracles grade this shape as choice);
- `type: 'numeric'` without `numericAnswer`: scores any input `false` via both
  entry points (`gradeChoice` and island-equivalent `isNumericQuestion` +
  `gradeNumeric`).

**Verify**: `npm run test` → all pass including the new cases. Then
red-proof one case: temporarily revert the Step 2 guard and confirm the
keyless test FAILS (then restore).

## Test plan

- New cases in `tests/unit/template-slice.test.ts` as listed in Step 3.
- Structural pattern: the existing `describe('gradeChoice')` /
  `describe('isNumericQuestion')` blocks.
- Radio scoping (Step 1) has no unit layer — it is an attribute rename;
  evidence is typecheck + `interaction-qa.mjs` quiz journey staying green
  (run it if a preview environment is available; otherwise note as
  NOT EXECUTED in the plan row).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0, new keyless/mixed-shape cases exist and pass,
      and the keyless case was shown to fail without the guard
- [ ] `npm run lint` exits 0
- [ ] `grep -n 'name={\`${question.id}\`}' src/islands/common/Quiz.tsx`
      returns no matches (scoped form present)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Unifying on `isNumericQuestion` changes a currently-pinned passing test in
  a way that looks like a behavior regression rather than the intended
  tightening (the `type: 'short-answer'` + `numericAnswer` case at `:86`
  is the sensitive one).
- The content schema or sample content depends on keyless questions scoring
  `true` (grep `correctAnswer` in `src/content/` for missing keys first; if
  found, report instead of changing grading).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the question schema ever gains new answer-bearing shapes, they must be
  added to the single shared predicate — never a second dispatch check.
- Reviewer: scrutinize the `expected.length === 0 → false` guard against any
  legitimate ungraded-question use (none exists today; `Quiz.tsx` submits only
  when all answered).
- Future quiz work interacts with plan 015 (score persistence) — grading
  verdicts feed `recordQuiz`, whose storage hardening is separate.
