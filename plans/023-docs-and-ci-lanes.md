# Plan 023: Fix README/docs pointers and tighten CI + lint scope

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- README.md README-COURSE.md CONTRIBUTING.md .github/workflows/quality.yml package.json eslint.config.mjs tsconfig.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M (docs rewrite needs an owner decision: delete vs archive —
  default to thin-pointer per Step 1; S if the owner pre-decides)
- **Risk**: LOW (docs + CI config only; full gate stays on `main`/deploy)
- **Depends on**: none
- **Category**: docs + dx
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

The root README is a 500-line Pi manual for deleted tooling (`./p`,
`pi-doctor.sh`, `.pi/`, eval fixtures) — a newcomer following it runs
commands that don't exist, while the correct path (`README-COURSE.md`) is
discoverable only by luck. `CONTRIBUTING.md` points at the README for omp
install instructions that aren't there, and `README-COURSE.md` understates
`npm run check`. In CI, every content-only PR pays a cold full build with no
cache, and `tests/**` gets neither lint nor typecheck while prettier runs
nowhere.

## Current state

- `README.md:1` banner says "migrated to omp" but the body instructs Pi:
  `:80` `pi-coding-agent@1.0.4` install, `:86` `pi-doctor.sh`, `:92-98` `./p`
  + `PI_GUARD_MODE`, `:101,260` `docs/TOOLING_SETUP.md`, `:121`
  `.pi/models.env`, `:350` `.pi/settings.json`, `:411-415`
  `verify-affected.mjs` + `.pi/verification.json`, `:463`
  `.pi/verification.json` layout. Glob-verified absent: `./p`, `.pi/`,
  `scripts/pi-doctor.sh`, `scripts/verify-affected.mjs`,
  `docs/{TOOLING_SETUP,RESEARCH,EVALUATION}.md`.
- `README-COURSE.md:1-27` is the true onboarding path (`npm install`,
  `npm run dev`, Node ≥ 22.19) but `:22` says `npm run check` = "validate +
  typecheck + test + build + budgets" while `package.json:12` `check` runs
  validate + typecheck + lint + test + build + test:dist + validate:links +
  budgets.
- `CONTRIBUTING.md:8`: "Install omp from https://omp.sh as described in
  `README.md`" — the README's install section describes Pi, not omp.
- `.github/workflows/quality.yml:25-31`: Node 22, no `cache: npm`, always
  full `bash scripts/verify.sh` → `ci`. `deploy.yml:35-38` provisions the
  same toolchain *with* `cache: npm`.
- `package.json:34-36` already defines `verify:fast` (unit only) and
  `verify:feature` (validate + test + build + test:dist); no workflow uses
  them. `scripts.ci:33` omits `format:check` (prettier + `prettier-plugin-astro`
  installed, no config file, no `.editorconfig`).
- `eslint.config.mjs:21` ignores `tests/**` with a content-MDX rationale
  comment (`:22-25`) that does not apply to `tests/unit/*.test.ts`;
  `tsconfig.json:23` includes `src/**` only — tests get neither lint nor
  typecheck.
- `CHANGELOG.md` Pi history is an intentional audit trail — do NOT touch it.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Unit tests| `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |
| Validate  | `npm run validate`       | `No content errors found.` |

## Scope

**In scope** (the only files you should modify):
- `README.md` (thin pointer rewrite)
- `README-COURSE.md` (one-line `check` description fix)
- `CONTRIBUTING.md` (one-line omp pointer fix)
- `.github/workflows/quality.yml` (cache + lanes)
- `package.json` (only if a new lane script is needed; prefer reusing
  `verify:fast`/`verify:feature`)
- `eslint.config.mjs` (`tests/**` ignore only — narrow to content, or drop
  and fix fallout in the same change)
- `tsconfig.json` (include `tests/**` — or record exclusion as intentional)
- Prettier config + `.editorconfig` (create, only if gating `format:check`)

**Out of scope** (do NOT touch, even though they look related):
- `CHANGELOG.md` — audit trail, retained.
- `docs/` product/architecture/design content — no product edits.
- `scripts/omp-pr.mjs`, `scripts/verify.sh` logic — CI calls them, doesn't
  rewrite them.
- Dead-alias/vitest-comment cleanup — plan 020 owns it.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per slice (README rewrite; pointer fixes; CI lanes; lint scope);
  short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite root README as a thin pointer

Replace the Pi-manual body with: template identity (one paragraph) →
`README-COURSE.md` (course authoring), `DEPLOYMENT.md` (hosting),
docs table (`PRODUCT`/`ARCHITECTURE`/`DESIGN`/`QUALITY`/`CONTENT-CONTRACT`/
`AI-CONTENT-PROMPT`/`HARNESS`/`GIT_POLICY`), `CONTRIBUTING.md`, `SECURITY.md`.
Move Pi history behind one link (or one short "migrated from Pi" note) — do
not silently drop anything the banner intends as historical record. Keep the
no-license-selected note (`README.md:531`-area) if still true.

**Verify**: every path/command the new README names exists
(`ls` each referenced file; no `./p`, no `pi-doctor.sh`, no `.pi/`).

### Step 2: Fix the two pointer lines

- `README-COURSE.md:22`: list the full gate or replace the parenthetical
  with "full gate (see `scripts.check` in `package.json`)".
- `CONTRIBUTING.md:8`: point at the real omp install source (https://omp.sh
  directly) or inline the two-line install — do not point back at the README.

**Verify**: `npm run validate` → green (docs-only, sanity).

### Step 3: CI fast lane + cache

- Add `cache: npm` to `quality.yml` setup-node (parity with `deploy.yml`).
- Route per-PR: cheap lane first (`npm run validate` + unit `npm run test`,
  or `verify:fast`/`verify:feature`) and keep full `ci` for `main` or when
  the cheap lane passes. Simplest shape preserving the backstop: add a
  `quick` job running validate+unit on `pull_request`, keep the existing
  `verify` job (full gate) — do not weaken the `main`/deploy backstop.

**Verify**: YAML parses (`node -e` with a YAML parser or `gh workflow view`
if available); do not merge without a CI run on the branch.

### Step 4: Lint/typecheck/format scope

- `eslint.config.mjs`: narrow the `tests/**` ignore so `tests/unit/**` and
  `tests/output/**` are linted (the MDX rationale covers `src/content/**`
  only). Fix any resulting fallout in the same change; if fallout is large,
  report instead of weakening rules.
- `tsconfig.json`: include `tests/**` for typechecking (or record the
  exclusion as intentional with a comment — either is acceptable, decide and
  document).
- Prettier: add the missing config (including `prettier-plugin-astro`) +
  `.editorconfig`; run `format:check` once — land the format pass in the same
  change if you gate it in `ci`. If the backlog is large, add config without
  gating and note the follow-up.
- Test-design gate: before changing any test to satisfy the newly-applied
  lint/type rules, apply the `/skill:test-design` value gate (AGENTS.md) — a
  test is changed only to close a distinct evidence gap. NEVER weaken, skip,
  or delete a valid test to get green; if a rule flags a valid test pattern,
  narrow the rule or document the exclusion instead.

**Verify**: `npm run lint` → exit 0; `npm run typecheck` → exit 0;
`npm run test` → all pass.

## Test plan

- No new behavior tests (docs + CI config). Evidence: reference-existence
  checks (Step 1), gates green (Steps 2–4), CI run on the branch for Step 3.
- If Step 4 surfaces real lint/type errors in tests, those fixes get their
  own verification via the same gates.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "pi-doctor\|pi-coding-agent\|TOOLING_SETUP\|verify-affected" README.md`
      returns no matches (history quarantined to at most one note/link)
- [ ] Every file/command named in the new README exists
- [ ] `README-COURSE.md` `check` description matches `package.json`
      `scripts.check`
- [ ] `CONTRIBUTING.md` omp pointer resolves (no back-pointer to README Pi
      section)
- [ ] `quality.yml` has `cache: npm` and a cheap per-PR lane; full gate
      retained for `main`
- [ ] `npm run lint`, `npm run typecheck`, `npm run test` all exit 0 with
      tests included in lint/typecheck scope (or exclusion documented)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- The owner wants the Pi manual preserved in full (delete-vs-archive
  decision goes the other way) — follow the owner's call, don't relitigate.
- Step 4 fallout (lint/type/format backlog) exceeds ~30 minutes — report the
  count and gate only the config, not the backlog.
- CI changes can't be validated without merging — report, don't weaken the
  backstop to force green.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- New docs must name only paths/commands that exist — reviewers: check links.
- If lanes diverge (quick green, full red), the quick lane is missing a gate
  — fix the lane mapping, not the full gate.
- Credential rule: no secrets involved; `file:line` only if encountered.
