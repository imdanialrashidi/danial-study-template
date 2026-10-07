# Plan 012 [SPIKE]: Decide the per-course motif mechanism

> **Executor instructions**: This is a DESIGN/SPIKE plan, not a build plan.
> Do not implement theming changes. Investigate the token pipeline, lay out
> 2–3 options with honest costs, and recommend one — so a future build plan
> executes a decided mechanism. If anything in the "STOP conditions" section
> occurs, stop and report — do not improvise. When done, update the status
> row for this plan in `plans/README.md` — unless a reviewer dispatched you
> and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/themes.ts src/styles/theme.css tailwind.config.cjs src/config/course.ts docs/DESIGN.md docs/PRODUCT.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S (spike; coarse by design)
- **Risk**: LOW
- **Depends on**: plan 008 (theme naming cleanup — spike on the cleaned vocabulary); plan 010 (do NOT finalize before knowing the Tailwind version, since v4 moves config into CSS)
- **Category**: direction
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

Two product docs defer the same question: "per-course visual motifs (beyond
the accent override) — worth the maintenance cost?" (`docs/PRODUCT.md`),
"distinct per-course motif art deferred until a real course needs it"
(`docs/DESIGN.md` decision log). Today a course moves exactly two roles
(`--color-primary`/`--color-accent` via preset + `theme.colors`); Physics
"feeling like Physics" beyond a hue shift has no sanctioned mechanism, so the
first real course will either fork `theme.css` (a documented defect,
`docs/QUALITY.md` #15) or ship generic. Decide the mechanism BEFORE that
course arrives.

## Current state

- Pipeline: `src/lib/themes.ts` presets (`default/physics/calculus/
  programming/statistics`) → `resolvedTheme()` → `themeStyleAttribute()`
  inlines `--course-rgb-*` on `<html>` (BaseLayout) → `src/styles/theme.css`
  owns all roles → exposed to Tailwind in `tailwind.config.cjs`.
- Invariants (non-negotiable): shared token source stays `theme.css`; no
  per-course fork; contrast pairs measured per `docs/DESIGN.md` table
  (text ≥4.5:1, control borders ≥3:1); meaning never color-alone;
  `prefers-reduced-motion` honored.
- Owner direction (DESIGN.md): illuminated-worksheet thesis fixed; no new
  visual system per course without sign-off.
- Caution: plan 010 may move Tailwind v3→v4 (CSS-based config) — any mechanism
  must survive that; do not finalize token plumbing pre-migration.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Validate (untouched tree proof) | `npm run validate` | `No content errors found.` |

## Scope

**In scope**:
- Investigation + a written recommendation (location per plan 011 convention:
  in THIS file unless the maintainer pre-approved elsewhere).

**Out of scope** (do NOT do):
- Changing any token, preset, component, or doc.
- Designing actual motif artwork (that belongs to the real course's design slice).
- Reopening the fixed thesis (illuminated worksheet) — motifs live INSIDE it.

## Git workflow

- Branch: per operator instruction; expect ZERO `src/` changes.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Map what "motif" could legally touch

Trace exactly which surfaces a course MAY vary without forking `theme.css`:
preset roles, `theme.colors` overrides, `motif`/`typography` fields in
`ThemeConfig` (are they read anywhere today? grep), the homepage figure plate,
section-marker language. List the hard walls (token source, contrast table,
no-dashboard-grids rule).

**Verify**: a one-paragraph map + the grep result for `motif`/`typography`
readers. If those fields already drive rendering somewhere, STOP and report
(a mechanism half-exists; the question changes).

### Step 2: Lay out 2–3 options with trade-offs

Sketch (words + token-level examples, no code): e.g. A) extended role set
(motif recolors within measured contrast); B) sanctioned figure/marker slot
(course-supplied SVG + label, constrained geometry); C) "no motifs, presets
only" (explicitly keep the deferral). For each: maintenance cost, contrast
re-measurement burden, what breaks the shared shelf, and what a real course
(Physics) would gain.

**Verify**: each option states its contrast-maintenance story (the DESIGN.md
table must stay true per course).

### Step 3: Recommend and scope the future build

Record: RECOMMEND (one option) or DEFER-again with the trigger condition
("revisit when a real course requests X"); the future build plan's shape
(files, tests — likely contrast-table + token-grep assertions); max 3 open
questions for the maintainer.

**Verify**: `git status` shows at most this plan file modified.

## Test plan

- No tests (decision artifact). Future build plan defines its own (expected:
  token-ownership grep test + contrast assertions per motif).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Written recommendation exists covering: legal surfaces, 2–3 options with trade-offs + contrast story, verdict, future build sketch
- [ ] No `src/`, test, config, or doc file modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE with the verdict in one line

## STOP conditions

Stop and report back (do not improvise) if:

- `motif`/`typography` config already drives rendering (mechanism exists — report where; the spike becomes a documentation task).
- Plan 010's Tailwind outcome invalidates the token pipeline assumptions — mark BLOCKED on 010, do not speculate.
- The investigation suggests forking `theme.css` per course — that violates QUALITY #15; recommend against, do not design it.

## Maintenance notes

- Revisit trigger lives in the verdict — do not re-spike without a real
  course request.
- Reviewers: judge mechanism cost honesty, especially contrast re-measurement.

## Spike outcome (executed 2026-10-07, isolated copy /tmp/exec-012, no tree changes)

**Verdict: RECOMMEND Option B (sanctioned motif slot, constrained geometry);
build DEFERRED until trigger.**

- **Investigation confirmed:** `motif`/`typography` config has ZERO readers
  (declarations + scaffold only) — no mechanism half-exists. Tailwind still v3
  in the investigated tree; plan 008/010 unlanded there, as expected.
- **Option B:** template owns the frame forever (homepage plate geometry,
  caption/aria/placeholder, `InteractiveFigure` contract); a course supplies
  ONLY SVG strokes/labels using existing measured roles (`text-primary` etc.).
  Contrast story is free (DESIGN.md table stays true by construction, enforced
  by a token-ownership grep: no hex in course-supplied slots). Maintenance LOW;
  shelf coherence HIGH.
- **Rejected:** A (extended role set — every course pays full contrast
  metrology, HIGH maintenance); C (presets-only — guarantees a worse forced
  decision later, first Physics course ships generic or forks `theme.css`).
- **Trigger to build:** (a) first real non-sample course requests disciplinary
  artwork, AND (b) plan 010 landed, AND (c) plan 008 landed. Do not re-spike
  without that trigger.
- **Open questions:** (1) wire dormant `motif` key to the slot or delete it
  with plan 008? (2) one homepage-plate slot enough, or per-course
  `InteractiveFigure` defaults too? (3) who authors/approves the first SVG set?
