# Plan 022: Surface the inline Formula error and build the /saved page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/components/educational/Formula.astro src/pages src/islands/common/BookmarkToggle.tsx src/lib/progress.ts src/components/layout/Header.astro docs/DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M (S for the Formula half; S for the /saved slice; one plan
  because both are small UI surfaces with the same verification)
- **Risk**: LOW (Formula: display-only; /saved: static shell + existing store
  pattern, `noindex`)
- **Depends on**: plans/011-bookmarks-spike.md (verdict RECOMMEND — this plan
  executes it); plan 015 SHOULD land first (sanitize hardening covers the
  stale-id pruning this page relies on)
- **Category**: bug (Formula) + direction-build (saved)
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

A broken inline formula vanishes as an empty span in running prose — authors
ship invisible math with a green build, while the block form right below it
fails loudly. And product flow #5 ("bookmark it, and see progress persist")
is half-delivered: learners can save but can never find their saves, so the
feature reads as broken. Both are small, high-clarity UI slices.

## Current state

- `Formula.astro:36-44` tries render, captures `error`, sets `rendered = ''`;
  inline branch (`:48-49`) renders `<span set:html={rendered}/>` ignoring
  `error`; block branch (`:52-57`) shows a `role="alert"` plate with message
  + source. (Do NOT touch the block branch.)
- Spike 011 outcome (in `plans/011-bookmarks-spike.md:138-165`, executed
  2026-10-07): **RECOMMEND — route `/saved`**, `SavedList` island ports the
  `CourseProgress` client-filter pattern (static empty shell + `useEffect`
  read of `snapshot().bookmarks`, re-read on `dr-progress`/`storage`);
  links via `withBase(entry.path)`; `noindex,follow` (precedent:
  `search.astro`); empty plate with imperative CTA; honest
  unavailable-storage notice; silent stale-id pruning (mirrors
  `completionRatio`'s known-set rule); glossary INCLUDED in a trailing group;
  one `Header.astro` nav entry last, gated on `isEnabled('progress')`.
- Key caveat (spike `:147-150`): `CourseLayout` passes bare `entry.id` to
  bookmark writes, so cross-kind slug collisions are real. **Decision for
  this plan: collision-tolerant matching now** (match bookmark id against
  both `e.id` and `e.qualifiedId`, prefer exact qualified, then unique bare —
  the same matcher shape as plan 013's `prereqMatches`); qualified-id
  migration explicitly deferred.
- Precedents: `search.astro:1-35` (island + static shell + `noindex`);
  `CourseProgress.tsx:18-37` (filter pattern); `useHydrated`
  (`islands/common/useHydrated.ts`) for `data-hydrated`.
- Design constraints (`docs/DESIGN.md`): dot-leader rows, paper/surface roles,
  `dir="rtl" lang="fa"` (inherited), one `<h1>`, 360–1360px, Persian
  imperative voice, no dashboard stat-cards, visible focus, 44px targets.
- Open spike questions for maintainer (spike `:163-165`): (1) settled here as
  tolerant-matching; (2) bookmark glyph — reuse `Icon name="bookmark"`;
  (3) v1 scope = per-row un-bookmark only, no "clear all".

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope** (the only files you should modify/create):
- `src/components/educational/Formula.astro` (inline branch only)
- `src/pages/saved.astro` (create)
- `src/islands/common/SavedList.tsx` (create)
- `src/components/educational/SavedList.astro` (create, thin `client:*`
  wrapper per `CONTENT-CONTRACT.md` — register in `src/lib/mdx.ts` ONLY if
  MDX use is needed; otherwise page-only import is fine)
- `src/lib/mdx.ts` (conditional: ONLY if the wrapper must be usable from MDX
  prose — otherwise do not touch; a page-only import needs no registration)
- `src/components/layout/Header.astro` (one nav line, gated)
- `tests/output/build-output.test.ts` (extend: `/saved` asserts h1/RTL/
  noindex — follow existing invariant blocks)

**Out of scope** (do NOT touch, even though they look related):
- Block-formula error UI — already correct.
- Bookmark stored-id format migration — deferred per spike; tolerant
  matching only.
- "Clear all" button, cross-device sync (PRODUCT non-goal), analytics.
- Search/palette scoring (plan 021), index payload (plan 024).

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per slice (Formula fix; /saved page); short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Inline Formula error surface

Mirror the block error in the inline branch: when `error` is set, render a
small inline `role="alert"` (e.g. `<span role="alert" class="...">` with the
message + source in Persian, styled as danger text, never widening the
line-box beyond one line where possible) instead of the empty span. Keep the
success path byte-identical.

**Verify**: `npm run build` → exit 0. Break one inline formula in a scratch
copy (temporarily corrupt a `latex` prop), build, confirm the alert text
appears in output (then revert). This is the red proof.

### Step 2: `SavedList` island + `/saved` page

Build per the spike: static shell (empty plate + CTA rendered server-side so
no-JS readers see something meaningful) + `SavedList` island filtering a
server-passed entry list (`{id, qualifiedId, title, path, kind, section}`)
by `snapshot().bookmarks` with tolerant matching; stale ids pruned silently;
unavailable-storage notice when `ProgressBridge.persistent` is false;
grouped by section with a trailing «واژه‌ها» group; `withBase` on every link;
`useHydrated('saved')` marker. Page: `noindex,follow`, one `<h1>`
«نشان‌شده‌ها», header nav entry last gated on `isEnabled('progress')`.

**Verify**: `npm run typecheck` → exit 0; `npm run build` → exit 0;
`npm run validate` → green.

### Step 3: Output-test invariants + gates

Extend `tests/output/build-output.test.ts` following its existing blocks:
`/saved` declares RTL, exactly one `<h1>`, carries `noindex`, and contains
the empty-plate CTA text. Run the full gates.

**Verify**: `npm run test` → all pass; `npm run lint` → exit 0. Preview +
`interaction-qa.mjs` bookmark journey when available (save → /saved lists →
un-bookmark removes); otherwise note NOT EXECUTED.

## Test plan

- Formula: scratch-corruption red proof (Step 1); no permanent test (error UI
  is display-only; permanent snapshot would pin copy — per QUALITY.md, `No
  new test` needs justification, and here the build-time throw behavior of
  `WorkedExample` is the stronger precedent if the maintainer prefers throw
  over inline alert — either is acceptable, record the choice).
- /saved: output-test invariants (Step 3); unit-test the tolerant matcher if
  extracted to a pure function (preferred: extract `matchBookmark(id,
  entries)` into the island file's exports or `lib/`, test bare/qualified/
  ambiguous/stale cases).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run test`, `npm run validate`,
      `npm run lint`, `npm run build` all exit 0
- [ ] `grep -n 'role="alert"' src/components/educational/Formula.astro`
      shows both inline and block branches
- [ ] `src/pages/saved.astro` exists with `noindex` + one `<h1>`;
      header nav contains the entry gated on `progress`
- [ ] Output tests assert `/saved` RTL/h1/noindex and pass
- [ ] Tolerant matcher unit-tested (or inline logic reviewed + noted)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- The maintainer prefers build-time throw over inline alert for Formula
  (WorkedExample precedent) — stop and confirm before building the alert.
- Stored bookmark ids cannot be resolved to paths at all (spike data premise
  false — its STOP condition, re-checked here).
- Anyone asks for "clear all", sync, or accounts — out of scope (PRODUCT
  non-goals); point at the plan, don't expand.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If bookmark ids migrate to qualified form later, the tolerant matcher
  keeps working (superset logic) — remove the bare branch only when the
  validator enforces qualification.
- The inline-alert copy is Persian author-facing; keep it consistent with the
  block-form wording.
- Reviewer: confirm glossary inclusion and per-row-only un-bookmark match the
  maintainer's answers to spike questions 2–3.
