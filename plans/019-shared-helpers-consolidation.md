# Plan 019: Consolidate Persian digits, labels, icons, and base-prefixing

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/lib/utils.ts src/lib/content.ts src/islands/common/Quiz.tsx src/islands/common/StepReveal.tsx src/islands/common/Controls.tsx src/components/content/TableOfContents.astro src/components/content/EntryCard.astro src/islands/common/SearchIsland.tsx src/islands/common/CommandPalette.tsx src/components/ui/Icon.astro src/components/ui/icon-names.ts src/layouts/CourseLayout.astro tests/unit/utils.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (pairs well with plan 020; both are mechanical sweeps
  over mostly disjoint files — do not edit the same file in both plans at once)
- **Category**: tech-debt
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

Five copies of one Persian-digit regex, two byte-identical label maps next to
the canonical one, ~8 hand-copied SVG icon paths already diverging in stroke
width with no design intent, a `padStart(2,'۰')` numeral hack that diverges
from the canonical helper on orders ≥10, and a hand-rolled base-prefix lambda
in the search index that reintroduces the exact project-site 404 class the
`withBase` helper exists to prevent. Every tweak must be repeated N times;
one divergent copy is already wrong.

## Current state

- Canonical digit helper: `src/lib/utils.ts:11-13` `toPersianDigits`;
  canonical numeral: `:23-25` `toPersianNumeral` (zero-padded Persian digits).
  Pinned by `tests/unit/utils.test.ts`.
- Copies: `Quiz.tsx:7-10` (`FA_DIGITS` + exported `toPersian`, zero
  importers — every island already imports from `utils` elsewhere);
  `StepReveal.tsx:26-29` (private copy); `Controls.tsx:22-24`
  (`FA` + `fa` + `fmt`); `TableOfContents.astro:39`
  (`'۰۱۲۳۴۵۶۷۸۹'[Number(d)]` inline).
- Numeral hack: `EntryCard.astro:7,26` —
  `toPersianDigits(entry.order).padStart(2, '۰')` (pads with Persian zero
  *after* Latin conversion; `toPersianNumeral` used correctly in
  `CourseRoadmap`, `index.astro`, `map.astro`).
- Canonical labels: `SINGULAR_LABELS` (`content.ts:68-75`) used by `EntryCard`,
  `PrevNextNav`, `CourseLayout`, `Prerequisite`. Duplicates:
  `SearchIsland.tsx:24-31` and `CommandPalette.tsx:20-27` byte-identical
  `TYPE_LABELS` (`SearchIsland.tsx:155` uses it; palette equivalent).
  Note `ContentType` vs `EntryKind` are structurally identical today.
- Canonical icons: `Icon.astro:20-58` path table (27 icons, 1.5px stroke,
  `currentColor`) + `icon-names.ts:7-34` union. Copies: `ProgressToggle.tsx`
  check/circle, `Quiz.tsx:298-311` check/cross, `CourseProgress.tsx:47-50`
  check, `StepReveal.tsx` check + chevron, `SearchIsland.tsx` search/cross,
  `CommandPalette.tsx` search, `BookmarkToggle.tsx:40-51` bookmark path —
  ~8 sites, some at 1.75 width vs canonical 1.5.
- Base prefix: `withBase` (`url.ts:25-35`, ~15 call sites, handles
  external/`#`/`?`) vs `buildSearchIndex` inline lambda
  (`content.ts:325-328`, naive `base+path`). Remark plugin
  (`remark-base-links.mjs`) is the Markdown-link layer — legitimate, untouched.
- Difficulty labels: canonical `DIFFICULTY_LABELS` (`utils.ts:86-90`, used by
  `EntryCard`, `WorkedExample`, `index.astro`); inline duplicate
  `CourseLayout.astro:44-46`. Fold into this plan (same sweep pattern).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/islands/common/Quiz.tsx`, `StepReveal.tsx`, `Controls.tsx`,
  `SearchIsland.tsx`, `CommandPalette.tsx`, `ProgressToggle.tsx`,
  `CourseProgress.tsx`, `BookmarkToggle.tsx`
- `src/components/content/TableOfContents.astro`, `EntryCard.astro`
- `src/components/ui/Icon.astro`, `src/components/ui/icon-names.ts`
  (+ new `src/islands/common/IslandIcon.tsx` — create)
- `src/layouts/CourseLayout.astro` (difficulty-label import only)
- `src/lib/content.ts` (`buildSearchIndex` lambda only — one hunk)
- `tests/unit/utils.test.ts` (extend only if a helper needs a new pin)

**Out of scope** (do NOT touch, even though they look related):
- Search scorer weights/logic (plan 021 owns unification).
- `src/lib/utils.ts` splits or renames — reuse as-is.
- `astro.config.mjs` aliases, `route()`, dead types (plan 020).
- Visual redesign — stroke widths converge ON the canonical 1.5, no new art.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step (one commit per sub-sweep); short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Digits + numerals + difficulty labels

- `Quiz.tsx`: replace `FA_DIGITS`/`toPersian` with `toPersianDigits` import;
  delete the export (zero importers — verify with grep first; if an importer
  appears, STOP). `StepReveal.tsx`, `Controls.tsx` (`fa` → shared import,
  keep local `fmt` composed on it), `TableOfContents.astro:39` likewise.
- `EntryCard.astro:26`: replace with `toPersianNumeral(entry.order)`.
- `CourseLayout.astro:44-46`: import `DIFFICULTY_LABELS`, delete inline map.

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass.

### Step 2: Labels — reuse `SINGULAR_LABELS`

Import `SINGULAR_LABELS` in `SearchIsland.tsx` and `CommandPalette.tsx`,
delete both local `TYPE_LABELS`. If the `ContentType` vs `EntryKind` key
difference blocks the import, add a one-line `TYPE_LABELS = SINGULAR_LABELS`
alias export in `lib/content.ts` (single hunk, documented) rather than
keeping two maps.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Icons — one shared path table

Extract the `Icon.astro:20-58` path strings into a `.ts` both sides import
(e.g. `icon-paths.ts` next to `icon-names.ts`), OR add
`src/islands/common/IslandIcon.tsx` (~20 lines: same props, React svg) that
imports the same table. Delete all local `CheckIcon`/`CrossIcon`/inline SVGs
in the in-scope islands, converging on canonical 1.5px stroke. `Icon.astro`
keeps its API (`name/size/class/strokeWidth`).

**Verify**: `npm run build` → exit 0; run `visual-qa.mjs` if a preview
environment is available (visual-only change; otherwise note NOT EXECUTED
and rely on pixel-identical paths).

### Step 4: `buildSearchIndex` calls `withBase`

Replace the `content.ts:327` lambda with `withBase`. Keep `absoluteUrl`
(absolute canonicals) and the remark plugin (author-written MDX links) as the
only other two layers; add a one-paragraph ownership comment at the call
site stating which layer owns what.

**Verify**: `npm run test` → all pass; `npm run build` → exit 0, then
`BASE_PATH=/physics2 npm run build && BASE_PATH=/physics2 npm run
validate:links` → exit 0 (project-site reproduction per `docs/QUALITY.md`).

## Test plan

- No new test files (pure consolidation; existing `utils.test.ts` pins the
  canonical helpers). Extend only if a helper gains behavior.
- Evidence per step: typecheck + unit + build + project-base link validation.
- Visual: `visual-qa.mjs` for Step 3 when available; path-string identity is
  the correctness argument otherwise.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`
      all exit 0
- [ ] `grep -rn "FA_DIGITS\|'۰۱۲۳۴۵۶۷۸۹'\[Number" src/islands src/components`
      returns no matches
- [ ] `grep -rn "TYPE_LABELS" src/islands` returns no matches (canonical
      import or alias in use)
- [ ] `grep -rn "CheckIcon\|CrossIcon" src/islands` returns no matches
      (shared icon in use)
- [ ] `grep -n "padStart(2, '۰')" src/components/content/EntryCard.astro`
      returns no matches
- [ ] `grep -n "base}.*path\|base}${" src/lib/content.ts` returns no matches
      (`withBase` in use)
- [ ] Project-site reproduction (`BASE_PATH=/physics2` build +
      `validate:links`) exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `Quiz.toPersian` has an importer (exported — verify before deleting).
- Any island-local icon intentionally diverges from canonical (check with
  design intent in `docs/DESIGN.md`; if a divergence is intentional, keep it
  and record why rather than converging).
- `withBase` inside `buildSearchIndex` breaks the unit-test import of
  `content.ts` (runtime base vs test env — report, do not fork the helper).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewers: reject new local digit tables / label maps / icon paths in PRs —
  point at the canonical modules.
- If `ContentType`/`EntryKind` diverge in the future, the Step 2 alias must
  be revisited (recorded at the alias site).
- Future URL-owning layers beyond the documented three need a comment update
  at the `buildSearchIndex` call site.
