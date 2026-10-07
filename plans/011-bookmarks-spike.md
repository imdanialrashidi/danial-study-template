# Plan 011 [SPIKE]: Design the bookmarked-content listing page

> **Executor instructions**: This is a DESIGN/SPIKE plan, not a build plan.
> Do not implement the page. Investigate, decide the smallest coherent shape,
> and record it so a future build plan can execute without new product
> decisions. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/progress.ts src/islands/common/BookmarkToggle.tsx src/pages docs/PRODUCT.md docs/DESIGN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S (spike; coarse by design)
- **Risk**: LOW
- **Depends on**: none (build plan, if approved, wants plans 001–009 landed for a clean tree)
- **Category**: direction
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

`docs/PRODUCT.md` "Open product decisions" asks whether to surface a
"bookmarked" listing page: `ProgressStore` already records bookmarks and
`BookmarkToggle` already writes them, but NO page reads them — bookmarking is
a write-only feature. This spike answers: route, data flow, states, and cost —
so the maintainer decides with a concrete proposal, not a vague wish.

## Current state

- `src/lib/progress.ts`: `bookmarks: string[]`, `toggleBookmarked`,
  `isBookmarked`, `snapshot()`; storage key `dr-study-progress:v1`;
  private-mode degrades to in-memory with `status: 'unavailable'`
  (UI must say so honestly — precedent: progress UI copy).
- Island: `src/islands/common/BookmarkToggle.tsx` (+ `CourseProgress.tsx`
  shows the `entryIds`-filtering pattern: client filters a server-rendered id
  list — reuse this, no new data plumbing).
- Pages precedent: `src/pages/search.astro` (island + static shell),
  `src/pages/formulas/index.astro` listing pattern; nav in
  `src/components/layout/Header.astro`; identity/links centralized in
  `src/config/site.ts` (never hard-code).
- Design constraints (`docs/DESIGN.md`): dot-leader lists, paper/surface
  roles, `dir="rtl" lang="fa"`, one `<h1>`, 360–1360px, empty/error states in
  Persian imperative voice, no dashboard stat-cards.
- Quality invariants: static-first (page readable without JS),
  `withBase()` on internal links, build-output tests assert h1/RTL/identity.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Validate (untouched tree proof) | `npm run validate` | `No content errors found.` |

## Scope

**In scope** (the only files you should modify):
- NOTHING in `src/` — investigation only.
- Your deliverable is a written recommendation (see Steps). If the maintainer
  pre-approved a location, write it there; otherwise append the findings as a
  `## Spike 011 outcome` section in THIS plan file (keeps the tree untouched).

**Out of scope** (do NOT do, even though they look related):
- Implementing the page, adding nav items, or changing any component/store.
- User research or analytics (the product collects none, by design).
- Cross-device sync (explicit non-goal in `docs/PRODUCT.md`).

## Git workflow

- Branch: per operator instruction; expect ZERO `src/` changes.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Map the cheapest data flow

Confirm: (a) `BookmarkToggle`'s stored ids are `qualifiedId`s resolvable via
`getAllEntries()`; (b) `CourseProgress`'s client-filter pattern ports to a
bookmarks list (static shell renders all entries' links? or an id list +
client filter — weigh HTML size vs simplicity); (c) where an entry link
resolves (`withBase(entry.path)` precedent in `ContentLayout.astro:38`).

**Verify**: write down the chosen flow in one paragraph + the two files it
reuses. If ids stored are NOT resolvable to paths, STOP (data premise wrong).

### Step 2: Specify states and placement (no code)

Decide and record: route (`/saved` vs `/bookmarks` — justify once);
nav/header entry point; required states (empty with CTA to browse,
unavailable-storage notice, list grouped by section reusing dot-leader
rows); SEO/canonical treatment (should it be `noindex`? argue it);
interaction with `glossary` kinds (bookmarks include them?).

**Verify**: every required DESIGN.md state (empty, error/unavailable, focus,
reduced-motion) has a one-line treatment in your note.

### Step 3: Cost it and recommend

Record: coarse effort (S/M with the line-items), what a follow-up BUILD plan
would contain (files, tests — likely a `build-output` assertion + island
filter test), what it must NOT do, and open questions for the maintainer
(max 3). End with a clear RECOMMEND / DEFER verdict and one-paragraph reason.

**Verify**: `npm run validate` still green (tree untouched); `git status`
shows at most this plan file modified.

## Test plan

- No tests (spike produces a decision, not behavior). The future build plan
  will define its own test plan (expected: extend `build-output.test.ts`
  invariants + unit coverage of the filter).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] A written recommendation exists (in this file or the pre-approved location) covering: route, data flow, states, SEO, effort, build-plan sketch, verdict
- [ ] No `src/`, test, or config file modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE with the verdict (RECOMMEND/DEFER) in one line

## STOP conditions

Stop and report back (do not improvise) if:

- Stored bookmark ids cannot be resolved to pages (data model premise false).
- The spike reveals the feature needs accounts/sync to be useful (contradicts PRODUCT non-goals) — recommend DEFER with that reason, do not redesign the product.
- Anyone asks you to "just build it" — decline per this plan's scope; point at the future build plan.

## Maintenance notes

- If approved, the build plan must reuse `CourseProgress`'s filter pattern and
  the dot-leader listing language — note that for its author.
- Reviewers: judge the verdict, not the prose length.
