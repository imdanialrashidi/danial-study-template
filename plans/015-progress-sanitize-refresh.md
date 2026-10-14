# Plan 015: Harden progress persistence and cross-tab refresh

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/lib/progress.ts src/islands/common/CourseProgress.tsx src/islands/common/ProgressToggle.tsx src/islands/common/BookmarkToggle.tsx src/islands/common/ProgressBridge.ts tests/unit/progress.test.ts`
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

Progress is the only learner state the product stores, and it is corruptible:
`sanitize` keeps duplicated ids (so `completionRatio` can report >100% and
overflow the progress bar) and admits `NaN`/`Infinity` quiz scores with missing
`total`. Separately, progress changed in a second tab never appears until
reload — `CourseProgress` listens to `storage` but recomputes from the stale
in-memory singleton — and `ProgressToggle`/`BookmarkToggle` never subscribe at
all, so same-page duplicate toggles drift apart.

## Current state

- `src/lib/progress.ts:43-62` `sanitize`: `completed`/`bookmarks` kept as-is
  when `isStringArray` (no dedupe); quiz filter (`:49-56`) only checks
  `typeof score === 'number'` — admits `NaN`, `Infinity`, missing `total`.
- `src/lib/progress.ts:69-73` constructor runs `read()` once; no public
  refresh path.
- `src/lib/progress.ts:182-188` `completionRatio`: counts
  `completed.filter(known).length` without dedupe — `['a','a']` over
  `['a','b']` yields `{done: 2, percent: 100+}`.
- `src/islands/common/CourseProgress.tsx:22-37`: `storage` + `dr-progress`
  handler calls `read()` which calls `ProgressBridge.completionRatio` on the
  singleton — never re-reads `localStorage`, so the `storage` listener is
  effectively dead for cross-tab updates.
- `src/islands/common/ProgressToggle.tsx:36-40` and
  `BookmarkToggle.tsx:22-24`: mount-only `useEffect` reads, no subscription.
- `src/islands/common/ProgressBridge.ts`: thin pass-through, no `refresh`.
- Existing pins: `tests/unit/progress.test.ts` — `MemoryStorage` harness
  (`:14-38`), corrupt-payload recovery (`:108-114`), malformed-value dropping
  (`:116-126`), subscriber notification (`:148-159`). Extend these blocks.
- Repo conventions: storage failure degrades honestly (`persistence:
  'unavailable'`); snapshot shape `{completed, bookmarks, quizzes, lastVisit}`
  must not change.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass, incl. new cases |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/progress.ts`
- `src/islands/common/ProgressBridge.ts`
- `src/islands/common/CourseProgress.tsx`
- `src/islands/common/ProgressToggle.tsx`
- `src/islands/common/BookmarkToggle.tsx`
- `tests/unit/progress.test.ts` (extend)

**Out of scope** (do NOT touch, even though they look related):
- Quiz grading semantics (plan 014) — only the stored `score`/`total`
  validation here.
- `BookmarkToggle` stored-id format (bare vs qualified) — pinned as a
  decision in plan 022 (`/saved`); do not migrate ids here.
- Any `.mdx` content, layouts, or the `/saved` page itself.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Dedupe and validate in `sanitize`, clamp `completionRatio`

In `src/lib/progress.ts`:

1. `sanitize`: dedupe `completed`/`bookmarks` preserving first-seen order
   (`[...new Set(...)]`).
2. Quiz filter: require finite numbers — `Number.isFinite(score)`,
   `Number.isFinite(total)`, `total > 0` (keep the existing truthiness/object
   checks; extend them).
3. `completionRatio`: count over a `Set` of completed ids (defense in depth
   for pre-existing corrupt payloads), and clamp `percent` to `0–100`.

**Verify**: `npm run test` → existing progress tests still pass.

### Step 2: Add `refresh()` and wire cross-tab + same-page updates

1. `ProgressStore`: add public `refresh()` that re-runs `read()` and notifies
   listeners (same notify path as `commit`, including the `dr-progress`
   dispatch).
2. `ProgressBridge`: expose `refresh()` pass-through.
3. `CourseProgress.tsx`: in the `storage` event handler call
   `ProgressBridge.refresh()` before `read()`; keep `dr-progress` as-is
   (same-tab writes already mutate the singleton).
4. `ProgressToggle.tsx` / `BookmarkToggle.tsx`: subscribe to updates — either
   `getProgressStore().subscribe(...)` with cleanup, or a `dr-progress`
   window listener re-reading `isCompleted`/`isBookmarked`. Prefer the
   existing `dr-progress` event (no new mechanism; `CourseProgress` already
   uses it).

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass.

### Step 3: Add regression cases

Extend `tests/unit/progress.test.ts` in the existing style (`MemoryStorage` +
`install`):

- duplicated ids in stored `completed` dedupe on load and `completionRatio`
  never exceeds 100;
- `NaN`/`Infinity` scores and missing/`total: 0` entries are dropped by
  `sanitize` (extend the `:116-126` malformed case);
- `refresh()` picks up an externally changed payload (write directly to the
  `MemoryStorage` map behind the store's back, call `refresh()`, assert the
  new value surfaces) and notifies subscribers.

**Verify**: `npm run test` → all pass including new cases. Red-proof the
dedupe case: temporarily revert the Step 1 `Set` and confirm it FAILS (then
restore).

## Test plan

- New cases in `tests/unit/progress.test.ts` as listed in Step 3.
- Structural pattern: the existing `MemoryStorage`/`install` harness and the
  malformed-payload block.
- Cross-tab `storage` event wiring has no jsdom layer — evidence is typecheck
  + code review of the handler; note as reviewer-checked, not test-proven.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0, new dedupe/NaN/refresh cases exist and pass,
      dedupe case shown to fail without the fix
- [ ] `npm run lint` exits 0
- [ ] `grep -n "refresh" src/lib/progress.ts src/islands/common/ProgressBridge.ts`
      shows the new path wired in both
- [ ] `snapshot()` shape unchanged (existing tests assert it)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Clamping/deduping breaks an existing test that pins unclamped behavior
  (none known — `progress.test.ts:104-106` pins `0%` on empty, which is
  unaffected — but if one appears, report).
- The subscribe/`dr-progress` wiring requires touching a layout or page file
  (out of scope) — report instead.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Stored payloads written before this fix may already contain dupes/NaN —
  `sanitize` cleans them on next load; no migration needed.
- If bookmark ids migrate to qualified form (plan 022 decision), `sanitize`
  stays valid — it never interprets id format.
- Reviewer: confirm `refresh()` on every `storage` event cannot clobber an
  in-flight same-tab write (events are synchronous; `storage` only fires
  cross-tab by spec, but assert the ordering in review).
