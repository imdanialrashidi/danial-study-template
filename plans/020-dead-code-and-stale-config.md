# Plan 020: Delete dead barrels, aliases, types, and stale config

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/lib/index.ts src/lib/url.ts src/lib/types.ts astro.config.mjs eslint.config.mjs vitest.config.ts .dockerignore src/islands/course/README.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (pairs with plan 019; disjoint files — do not edit the
  same file in both at once. If plan 018 chose the re-export fallback for
  `config/mdx-components.ts`, coordinate: that file is plan 018's.)
- **Category**: tech-debt
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

Dead export anchors mislead every new author: `lib/index` suggests a barrel
that nothing uses, `route()` duplicates `withBase`, `QuizConfig`/`ProgressState`
describe contracts superseded by `QuizProps`/`ProgressData`, five vite aliases
resolve nothing, and three configs reference files/dirs deleted in the omp
migration. Each is a future wrong-abstraction anchor and a stale-docs papercut.

## Current state

- `src/lib/index.ts:1-2`: `export type { CreatorIdentity, SocialLink }` +
  `export { courseConfig }` — zero importers (verified).
- `src/lib/url.ts:37-40`: `route(path)` trivial alias of `withBase` — zero
  callers (only its own definition matches).
- `src/lib/types.ts:197-205` `QuizConfig` (`showCorrectOnFail`, `timeLimit`
  unimplemented) and `:209-214` `ProgressState`
  (`completedSlugs`/`bookmarkedSlugs`) — zero references outside `types.ts`;
  superseded by `QuizProps` (`Quiz.tsx:13-20`) and `ProgressData`
  (`progress.ts:19-24`).
- `astro.config.mjs:58-66` vite `resolve.alias` (`@lib/@components/@layouts/
  @config/@islands`) — zero uses (all imports relative; verified).
- `eslint.config.mjs:16-32` ignores: `evals/**` (dir absent),
  `scripts/verify.sh` (actually `scripts/verify.sh` exists — verify the exact
  entry; the stale one is the `evals/**` line plus any `.pi/` remnant), and
  the `tests/**` ignore is INTENTIONAL-adjacent (plan 023 revisits whether
  tests should be linted — do not change the `tests/**` line here).
- `vitest.config.ts:14-16` comment cites "Pi harness's own `node --test`
  suites and eval fixtures" — fixtures deleted; comment stale.
- `.dockerignore:1-2` negates `Dockerfile.pi` — file absent.
- `src/islands/course/README.ts:1-12` — `export {}` placeholder keeping an
  empty dir, repeating the registry fiction (plan 018 rewrites its prose if
  it lands first — coordinate, don't duplicate).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/lib/index.ts` (delete)
- `src/lib/url.ts` (delete `route()` only)
- `src/lib/types.ts` (delete `QuizConfig`, `ProgressState` only)
- `astro.config.mjs` (delete dead alias block only)
- `eslint.config.mjs` (delete `evals/**` ignore only — NOT the `tests/**` line)
- `vitest.config.ts` (update stale comment only)
- `.dockerignore` (fix stale negation only)
- `src/islands/course/README.ts` ONLY if plan 018 has not touched it
  (check `git log --oneline -3 -- src/islands/course/README.ts` first)

**Out of scope** (do NOT touch, even though they look related):
- `eslint.config.mjs` `tests/**` ignore — owned by plan 023.
- `src/config/mdx-components.ts`, `registry.ts` — owned by plan 018.
- Any live import rewrites beyond deleting the dead anchors (no callers, so
  none should exist — if one appears, STOP).
- `CHANGELOG.md` Pi history — intentional audit trail, retained.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- One commit (deletions only); short imperative message.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm zero usage, then delete

For each anchor (`lib/index`, `route(`, `QuizConfig`, `ProgressState`,
`@lib|@components|@layouts|@config|@islands`), run the grep and record zero
hits (excluding the definition) in the commit message:

- `grep -rn "lib/index" src/ tests/ scripts/`
- `grep -rn "[^a-zA-Z]route(" src/ --include="*.ts" --include="*.astro" --include="*.tsx" | grep -v routeTo`
- `grep -rn "QuizConfig\|ProgressState" src/ tests/ scripts/`
- `grep -rn "@lib\|@components\|@layouts\|@config\|@islands" src/`

If any real usage appears, STOP and report it (dead-ness premise wrong for
that anchor — skip just that anchor, continue with the rest).

Then: delete `lib/index.ts`; delete `route()` from `url.ts`; delete both
interfaces from `types.ts`; delete the alias block from `astro.config.mjs`;
delete the `evals/**` ignore; fix `.dockerignore`; refresh the vitest
comment to describe the actual two-suite split without Pi references.

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass.

### Step 2: Course-dir placeholder (only if plan 018 hasn't)

Check `git log --oneline -3 -- src/islands/course/README.ts`: if plan 018
already rewrote it, skip this step. Otherwise replace the `export {}`
placeholder with a `.gitkeep` + one-line pointer comment (no fake module, no
registry-fiction prose).

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0.

## Test plan

- No new tests (deletions only). Evidence: typecheck + unit + lint + build
  green, and `dist/` content identical before/after (optional diff).
- The Step 1 greps are the safety proof (no hidden consumers).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run test`, `npm run lint`, `npm run build`
      all exit 0
- [ ] `ls src/lib/index.ts` fails (deleted); `grep -n "export function route"
      src/lib/url.ts` empty; `grep -n "QuizConfig\|ProgressState"
      src/lib/types.ts` empty
- [ ] `grep -n "alias" astro.config.mjs` empty (or only live aliases)
- [ ] `grep -n "evals" eslint.config.mjs` empty; `.dockerignore` references no
      absent file; vitest comment has no Pi references
- [ ] The Step 1 usage greps all returned zero (recorded in commit message)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Any dead-ness grep finds a real consumer (premise wrong for that anchor).
- A course fork known to the operator imports any deleted anchor — keep a
  one-line re-export for that anchor and report.
- `tests/**` lint inclusion looks required mid-flight — out of scope (plan
  023); report, don't expand.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Reviewers: new barrels/aliases need a consumer in the same PR — anchor
  without importer is rejected per this plan's precedent.
- If `QuizConfig`-like config (time limits) is ever wanted, design it fresh
  against `QuizProps`; do not resurrect the deleted interface.
- Credential rule: no secrets involved; if encountered, `file:line` only.
