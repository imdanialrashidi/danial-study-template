# Plan 002: Document the real build inputs in `.env.example`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- .env.example DEPLOYMENT.md astro.config.mjs src/config/site.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

A new contributor copies `.env.example`, which today documents only
`APP_ENV=development` — a variable nothing in the repo reads. The actual
build inputs, `BASE_PATH` and `SITE_URL`, are invisible there, so onboarding
starts with a wrong example and a missing one. Five lines fix it.

## Current state

- `.env.example` (whole file, 2 lines):
  ```
  # Document required variable names only. Never add real values.
  APP_ENV=development
  ```
- Repo-wide grep shows `APP_ENV` appears nowhere else — it is stale (likely
  harness leftover).
- Real inputs:
  - `astro.config.mjs:16-17`: `const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '')` and `const site = process.env.SITE_URL ?? 'https://imdanialrashidi.github.io'`.
  - `src/config/site.ts:120-131`: `siteUrl` overridden by `SITE_URL`,
    `basePath` from `BASE_PATH` (`''` = root deployment, `/repo` = GitHub
    Pages project site).
  - `docs/CONTENT-CONTRACT.md` §10 / `DEPLOYMENT.md`: "set `BASE_PATH` and
    `SITE_URL`; never hard-code a provider."
- File convention (first line): variable names only, never real values.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Content check | `npm run validate` | `No content errors found.`, exit 0 |

## Scope

**In scope** (the only files you should modify):
- `.env.example`

**Out of scope** (do NOT touch, even though they look related):
- `astro.config.mjs`, `src/config/site.ts`, `DEPLOYMENT.md` — semantics are correct; only the example is wrong.
- Any code or content file.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- One commit; short imperative message matching `git log` style.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the semantics from the deployment doc

Skim `DEPLOYMENT.md` for the exact meaning/values of `BASE_PATH` and
`SITE_URL` (empty vs `/repo`, example origin). Keep the existing header
comment line verbatim.

**Verify**: you can state in one sentence each what empty vs set `BASE_PATH`
means — if the doc contradicts `astro.config.mjs`, STOP (see below).

### Step 2: Rewrite `.env.example`

Replace the `APP_ENV` line with the real inputs, names only, with one-line
comments each. Target shape:

```
# Document required variable names only. Never add real values.
# Empty for root hosts (Cloudflare Pages custom domain); /<repo> for GitHub Pages project sites.
BASE_PATH=
# Canonical origin used for sitemap/canonical URLs.
SITE_URL=
```

Keep placeholder values empty (no real URLs — the header rule).

**Verify**: `cat .env.example` shows the shape above; `grep -rn "APP_ENV" .env.example` returns nothing.

## Test plan

- No new test: documentation-only change with no behavior. `No new test` is
  the correct outcome here (nothing executable changed).
- Regression net: `npm run validate` → exit 0, proving nothing else moved.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `.env.example` names `BASE_PATH` and `SITE_URL`, contains no real values and no `APP_ENV`
- [ ] `npm run validate` exits 0
- [ ] No files outside `.env.example` are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `DEPLOYMENT.md` describes additional required env vars beyond these two — the example would be incomplete; report the list instead of guessing.
- Any code reads `APP_ENV` after all (grep finds a reader) — it is not stale; keep it and document both.

## Maintenance notes

- When a new build input is added, its first change must include the
  `.env.example` line — reviewers should enforce this.
- No follow-up deferred.
