# Plan 010: Upgrade lagging majors (Astro 7, React 19, Tailwind 4, Vitest 5)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- package.json package-lock.json astro.config.mjs tailwind.config.cjs src/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: plans/005-search-rank-tests.md (ranking safety net must be green first)
- **Category**: migration
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

`npm audit` reports critical Astro advisories (XSS via `define:vars`,
spread-prop attribute names, `transition:*`/view-transition values, slot
names — all fixed in the 7.x line; installed `astro@5.18.2` is in the
affected range `<=7.2.7`). Reachability today looks LOW (the repo's only
`define:vars` use, `TelegramPopup.astro:91`, carries trusted constants;
no prop-spread onto DOM elements was found), but staying behind the fix
line plus React 18→19, Tailwind 3→4, Vitest 2→5 accumulates ecosystem drift
and forfeits upstream security fixes. Upgrade in dependency order with the
full gate at each phase.

## Current state

- `package.json` pins (all exact via lockfile): `astro 5.18.2`,
  `@astrojs/mdx 4.3.14`, `@astrojs/react 3.6.3`, `@astrojs/tailwind 5.1.5`,
  `react/react-dom 18.3.1`, `@types/react{,-dom} 18.3.x`, `tailwindcss 3.4.19`
  (+`tailwind.config.cjs`, `postcss`-era setup), `vitest 2.1.9`,
  `typescript 5.9.3`, `eslint 9.39.5`, `playwright-core 1.56.0`.
  `npm outdated` latest targets: astro 7.3.6, mdx 8.0.3, react-integration
  7.0.1, tailwind-integration 6.0.2, react 19.3.0, tailwindcss 4.3.3,
  vitest 5.0.3, eslint 10.12.0, typescript 7.0.2.
- gates: `npm run ci` = typecheck + lint + test + build + test:dist +
  validate:links + budgets. Browser evidence: `npm run preview` + 
  `node scripts/visual-qa.mjs` + `node scripts/interaction-qa.mjs`.
- Node floor: `engines: node >=22.19.0` — re-check each major's engine
  requirement before installing.
- Plan 005 (search-rank tests) MUST be DONE first — it is the ranking safety net.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Audit (read-only) | `npm audit --audit-level=high` | review only; do not `--force` blindly |
| Full gate | `npm run ci` | exit 0 |
| Browser QA | `npm run preview` (bg) + `node scripts/visual-qa.mjs`, `node scripts/interaction-qa.mjs` | exit 0, no overflow/console/page failures |
| Budgets | `npm run budgets` | `All performance budgets met.` |

## Scope

**In scope**:
- `package.json`, `package-lock.json`, and the minimum code/config edits each major demands (integration APIs, Tailwind config format, React 19 types, Vitest config).

**Out of scope** (do NOT touch, even though they look related):
- Product redesigns, copy, content, palette, or behavior "improvements" discovered mid-upgrade — log them, don't fold them in.
- `typescript@7`: evaluate, but do NOT jump major TypeScript in the same change unless zero-error on first try (see Phase D STOP).
- Publishing, deployment, or release chores.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit per phase, each green on `npm run ci` before proceeding.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A: Astro + integrations (security fix line)

1. Confirm plan 005 is DONE (ranking tests green).
2. Read the Astro 6→7 and `@astrojs/mdx 4→8` migration notes (official docs,
   version-matched) for breaking config/API changes affecting this repo
   (content collections API, `mdx({ remarkPlugins })` shape, `astro check`).
3. Upgrade the Astro set together (they move as a set). REVISED 2026-10-07:
   `@astrojs/tailwind` (even v6.0.2) peers `astro ^3||^4||^5` — verified via
   `npm view` — so it CANNOT ride along to Astro 7. Drop the integration and
   adopt the Vite plugin in the SAME step (this merges old Phase C here):
   `npm install astro@7 @astrojs/mdx@8 @astrojs/react@7 @astrojs/sitemap@latest
   @astrojs/check@latest @tailwindcss/vite@latest tailwindcss@4`
   (`@astrojs/sitemap@3.7.4` / `@astrojs/check@0.9.10` were already latest —
   nothing to do there), then remove the `tailwind()` integration import from
   `astro.config.mjs`, register `@tailwindcss/vite`, and migrate
   `tailwind.config.cjs` to CSS-based config per the official v3→v4 guide.
   Executor-flagged (confirm against version-matched docs during execution):
   Astro 7's new Markdown pipeline may require `@astrojs/markdown-remark` +
   `processor: unified()` to keep `markdown.remarkPlugins` and
   `mdx({ remarkPlugins })` (i.e. `remarkBaseLinks`) working.
4. Apply the minimal code/config edits the new majors require, nothing more.

**Verify**: `npm run ci` → exit 0. If red, fix only breakage attributable to
the upgrade (max two attempts per error class, then STOP).

### Phase B: React 19 + types

1. Upgrade `react`, `react-dom`, `@types/react`, `@types/react-dom` to 19.x.
2. Fix only type/api breakage (ref props, JSX namespace, removed APIs in islands).

**Verify**: `npm run ci` → exit 0.

### Phase C: Tailwind 4 — MERGED INTO PHASE A (revised 2026-10-07)

The `@astrojs/tailwind` peer conflict forces the Tailwind 4 migration into
the Astro 7 step — there is no separate Phase C anymore. The v3→v4 config
migration and the capture-compare verification below happen as part of
revised Phase A step 3. Token values in `src/styles/theme.css` stay
byte-identical (migration, not rebrand).

Capture-compare (still required before leaving Phase A): `npm run ci` → 0
AND `npm run budgets` met AND 390px + 1360px homepage captures compared
against the baselines at `/tmp/exec-010/.artifacts/visual/baseline-{390,1360}.png`
(taken 2026-10-07 from unmodified `dist/` on Astro 5.18.2 — re-take them in
the fresh executor copy if stale). Pixel drift beyond anti-aliasing → STOP.

### Phase D: Vitest 5, ESLint 10, remainder

Upgrade `vitest` (+ `playwright-core` patch 1.56→1.63 if clean),
`eslint` + `eslint-plugin-astro`, `globals`. Evaluate `typescript@7`
separately: try it ONLY if A–C are fully green; on ANY new type error class,
revert TS to 5.9.x and record it as deferred.

**Verify**: `npm run ci` → exit 0; `npm audit --audit-level=high` → Astro
criticals gone (record residual output).

### Phase E: Browser proof

With the final tree: `npm run build`, serve `npm run preview`, run BOTH
`node scripts/visual-qa.mjs` and `node scripts/interaction-qa.mjs` to green.

**Verify**: both scripts exit 0.

## Test plan

- Existing suite is the net (unit + build-output + budgets + browser scripts);
  plan 005 added ranking pinning. No new tests required unless a phase's
  breakage reveals an unpinned contract — then add the smallest test for THAT
  contract only.
- Baseline captures in Phase A (pre-visual-change) are the visual oracle for Phase C.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] Plan 005 DONE before starting
- [ ] `npm audit --audit-level=high` no longer reports the Astro critical GHSA set
- [ ] `npm run ci` exits 0 on the final tree
- [ ] `visual-qa.mjs` and `interaction-qa.mjs` both exit 0 against `preview`
- [ ] `npm run budgets` met (JS ≤120KB gzip, CSS ≤90KB gzip, no KaTeX runtime)
- [ ] No product/copy/content/palette diffs outside upgrade-necessitated edits (`git diff --stat` reviewed)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any phase's `npm run ci` stays red after two fix attempts on the same error class — report the error class, do not re-architect.
- Tailwind v4 requires redesigning token semantics (not just moving them) — stop; that's a design decision for the owner.
- TypeScript 7 introduces ANY new error class — revert TS alone, record deferred, continue the rest.
- A migration guide step contradicts `docs/DESIGN.md` token ownership (code tokens own values) — doc wins; stop and report the conflict.
- `npm install` wants to change the Node engine floor — stop; runtime upgrades need owner sign-off.

## Refinement (2026-10-07 — first dispatch STOPPED, plan revised, ready to re-run)

First execution (isolated copy `/tmp/exec-010`) STOPPED correctly at the
Phase A install: `npm install` of the original pinned set fails ERESOLVE
(`@astrojs/tailwind@6.0.2` peer `astro ^3||^4||^5` vs `astro@7.3.6`),
reproduced twice including the exact pinned set; no files were changed.
Advisor independently confirmed the peer conflict via
`npm view @astrojs/tailwind@6.0.2 peerDependencies`. Positive byproducts
preserved in `/tmp/exec-010`: pre-upgrade baselines
(`.artifacts/visual/baseline-390.png`, `baseline-1360.png`), full unmodified
`npm run ci` green + budgets met (JS 66.3KB/120KB, CSS 16.3KB/90KB) on Astro
5.18.2, and the recorded `npm audit` Astro critical set. Re-dispatch uses
revised Phase A above; all STOP conditions still apply.

## Maintenance notes

- After landing, unpin nothing: keep exact pins + lockfile discipline
  (`node scripts/verify-package-integrity.mjs --online` per README flow).
- Reviewers: scrutinize Phase C token mapping line-by-line; everything else
  should be mechanical.
- Deferred by design: TS 7 if it errored; any behavior "improvements" noticed
  en route (file as separate findings).
