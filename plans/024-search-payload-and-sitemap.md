# Plan 024: Trim per-page search payload and fix sitemap lastmod

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/layouts/BaseLayout.astro src/components/ui/CommandPalette.astro src/islands/common/CommandPalette.tsx src/pages/search.astro src/lib/content.ts astro.config.mjs scripts/check-budgets.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (touches the global layout hydration path; needs preview +
  interaction-QA evidence)
- **Depends on**: plan 021 SHOULD land first (shared scorer keeps ranking
  stable while payload shape moves); plan 019 SHOULD land first
  (`buildSearchIndex` uses `withBase` by then — shared payload inherits it)
- **Category**: perf
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

Every page ships O(entries) of index JSON as hydrated island props plus React
hydration on idle for a rarely-opened palette, and `/search` serializes the
same index twice. Budgets have headroom today (56 KB JS / 15 KB CSS vs 120/90
budgets per `docs/PRODUCT.md:82-84`), but per-page payload grows linearly with
catalog × pages. Separately, `lastmod: new Date()` marks every sitemap URL
changed on every build — the opposite of its comment — wasting crawl budget
per deploy.

## Current state

- `BaseLayout.astro:52-53`: `buildSearchIndex(await getAllEntries())` on
  every page when the palette flag is on; `:138` renders via
  `CommandPalette.astro:16` (`<CommandPalette client:idle items={items} />`).
- `search.astro:8,32`: builds the same index again for `<SearchIsland
  client:load>` — `/search` pays double.
- `buildSearchIndex` (`content.ts:325-339`): compact `{id,title,slug,type,
  section?,excerpt?,tags?}` — read the exact fields before reshaping; the
  "kept small on purpose" comment (`:318-324`) is the size contract.
- Budgets: `scripts/check-budgets.mjs` gates JS ≤120 KB gzip, CSS ≤90 KB,
  HTML ≤200 KB/page, no KaTeX runtime — this plan must keep all green with
  margin (record before/after numbers).
- Sitemap: `astro.config.mjs:46-56` — `lastmod: new Date()` + `/search`
  `noindex` filter (`:52-55`, keep untouched).
- Non-goals from ARCHITECTURE (chosen patterns): no search library, no worker
  until "a few thousand entries" — this plan stays inside that envelope
  (shared payload + on-demand mount, no new dependency).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |
| Budgets   | `npm run budgets`        | All performance budgets met. |
| Browser   | `node scripts/visual-qa.mjs` + `interaction-qa.mjs` (needs `preview`) | PASS |

## Scope

**In scope** (the only files you should modify):
- `src/layouts/BaseLayout.astro` (single shared payload; palette mount change)
- `src/components/ui/CommandPalette.astro` (mount directive / demand trigger)
- `src/islands/common/CommandPalette.tsx` (accept shared payload shape, if
  reshaped)
- `src/pages/search.astro` (reuse shared payload, no second build)
- `src/lib/content.ts` (`buildSearchIndex` shape only, if needed)
- `astro.config.mjs` (sitemap `lastmod` only)

**Out of scope** (do NOT touch, even though they look related):
- Scorer weights/logic (plan 021) — ranking must not change in this plan.
- Search UI/UX redesign, worker, or search library — explicitly rejected
  complexity per ARCHITECTURE.
- `_headers`, JSON-LD (plan 017); anything outside layout/search/sitemap.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per slice (sitemap fix; shared payload; demand mount); short
  imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix sitemap `lastmod` (independent micro-slice)

Drop `lastmod: new Date()` (or derive per-page from content modification
evidence if cheap — e.g. frontmatter `updated`; bare drop is acceptable and
preferred if derivation needs new plumbing). Keep the `/search` filter
untouched. Verify: build, diff `dist/sitemap-*.xml` before/after — URLs
identical minus `lastmod` (or stable per-page stamps).

**Verify**: `npm run build` → exit 0; sitemap diff shows the fix.

### Step 2: Share one index payload, build once

Record `npm run budgets` numbers first (baseline). Then: build the index once
per build and share one serialized payload between palette and search island
(e.g. build in `BaseLayout` and pass down; `search.astro` reuses instead of
rebuilding — exact mechanism is the executor's choice, but no page may
serialize it twice). Keep the payload fields identical unless a field is
provably unused by both consumers (grep both islands for each field first).

**Verify**: `npm run build` → exit 0; `npm run budgets` → green with
per-page HTML bytes down vs baseline (record both numbers in the commit
message); `/search` HTML contains the payload once (grep count).

### Step 3: Mount the palette on demand

Change the palette from `client:idle` on every page to first-`Ctrl/⌘+K`
demand mount (or the cheapest Astro-supported lazy directive that preserves
the shortcut + trigger behavior). The shortcut listener itself must stay
cheap and global; only the index props + React hydration defer.

**Verify**: `npm run build` → exit 0; preview + `interaction-qa.mjs`
(palette opens via shortcut, searches, navigates; `/search` journey green).
If no preview environment is available, STOP and mark the plan BLOCKED rather
than shipping an unverified hydration change.

## Test plan

- No new unit tests (payload/hydration are integration concerns). Evidence:
  budgets before/after, sitemap diff, grep-count for single serialization,
  `visual-qa.mjs` (no console errors, no overflow) + `interaction-qa.mjs`
  (palette + search journeys) on preview.
- Existing suites unchanged and green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run test`, `npm run validate`,
      `npm run lint`, `npm run build`, `npm run budgets` all exit 0
- [ ] Sitemap contains no build-time `lastmod` on every URL (diff evidence)
- [ ] `/search` serializes the index payload exactly once (grep-count evidence)
- [ ] Palette no longer hydrates on idle on content pages (directive evidence
      in built HTML or wrapper source)
- [ ] Per-page HTML bytes down vs Step 2 baseline (numbers recorded)
- [ ] `visual-qa.mjs` + `interaction-qa.mjs` PASS on preview (or plan marked
      BLOCKED with reason)
- [ ] Ranking unchanged (plan 021 tests green — no weight/logic edits here)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- No preview environment is available for Step 3 (hydration change without
  browser proof is not shippable — mark BLOCKED).
- Demand-mount breaks the `data-open-palette` trigger contract or the
  `useHydrated('palette')` QA marker — report rather than redesigning the
  trigger system.
- `lastmod` derivation needs new content plumbing (frontmatter waterfalls,
  git mtimes) — take the bare drop and report the deferred option.
- Sharing the payload requires touching a file outside scope (e.g. a new
  route or endpoint — static-first forbids it; report).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the catalog approaches a few thousand entries, revisit the ARCHITECTURE
  "add a worker" trigger — this plan buys headroom, not infinity.
- Future payload-field removals must grep both consumers first (recorded
  procedure in Step 2).
- Reviewer: confirm no ranking change leaked in (diff `search.ts`/scorer
  files must be empty).
