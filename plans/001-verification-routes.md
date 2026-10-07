# Plan 001: Route product files to targeted verification commands

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- .pi/verification.json scripts/verify-affected.mjs tests/verify-affected.test.mjs`
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

Every product edit (`src/**`, `src/content/**`, `scripts/validate-content.mjs`)
currently matches no route in `.pi/verification.json`, so
`node scripts/verify-affected.mjs --file <product-file>` falls through to the
generic `scripts/verify.sh` fallback (pi-doctor + full `npm run ci`). That
turns the documented fastest loop (`npm run validate && npm run test`,
`docs/QUALITY.md`) into a full typecheck+lint+test+build+budgets run on every
small change — slow feedback and wasted model calls for all later plans.

## Current state

- `.pi/verification.json` (version 1) has routes only for harness surfaces:
  `run-metrics`, `pr-delivery`, `workflow-evals`, `verification-router`,
  `safety-guard`, `harness-runtime`, `launcher`, `custom-provider`,
  `workflow-contract`; `fallback` is `[["bash", "scripts/verify.sh"]]`.
  No `include` entry mentions `src/**`, `scripts/validate-content.mjs`, or
  `tests/unit/**`.
- Route schema (exemplar — the `workflow-evals` route): each route is
  `{ "id": ..., "include": ["glob..."], "commands": [["argv", "..."], ...] }`
  where commands are argv arrays, e.g.
  `[["node", "--test", "tests/workflow-evals.test.mjs", ...]]`.
- `scripts/verify-affected.mjs` implements union-and-dedupe matching over
  `include` globs; unmatched files invoke the fallback. It supports
  `--plan` (print without executing).
- Repo conventions: canonical gates are `npm run validate` (content),
  `npm run test` (`vitest run tests/unit`), `npm run typecheck`
  (`astro check`), `npm run lint` (`eslint . --max-warnings 0`).
  Route tests live in `tests/verify-affected.test.mjs` (run via
  `node --test <file>`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `npm install`            | exit 0              |
| Router dry run | `node scripts/verify-affected.mjs --file <path> --plan` | prints matched route commands, not the fallback |
| Router tests | `node --test tests/verify-affected.test.mjs` | all pass |

## Scope

**In scope** (the only files you should modify):
- `.pi/verification.json`

**Out of scope** (do NOT touch, even though they look related):
- `scripts/verify-affected.mjs` — the router itself works; only its data is missing.
- `scripts/verify.sh` and `scripts/project-verify.sh` — fallback behavior is out of scope.
- Any product source, test, or doc file.

## Git workflow

- Branch: per operator instruction (this repo delivers via the fixed
  `ai-changes` lane with `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit in one logical unit; message style matches history (`git log` shows
  short imperative summaries).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Read the router contract and the existing test

Open `scripts/verify-affected.mjs` (matching semantics: glob flavor,
union/dedupe, what `--plan` prints) and `tests/verify-affected.test.mjs`
(how routes are asserted). Note the exact `include` glob style used
(e.g. `evals/**`).

**Verify**: `node scripts/verify-affected.mjs --file src/lib/math.ts --plan` → prints the fallback (`scripts/verify.sh`), proving the gap exists.

### Step 2: Add product routes to `.pi/verification.json`

Add routes (ids are suggestions; keep kebab-case, keep existing routes
byte-identical). Suggested mapping — adjust only if the router semantics from
Step 1 demand it:

1. `content`: include `src/content/**`, `src/content.config.ts`,
   `src/config/course.ts`, `scripts/validate-content.mjs`;
   commands `[["npm", "run", "validate"], ["npm", "run", "test"]]`.
   (Rationale: content edits need frontmatter/reference checks + unit suite;
   keep it cheap — no build.)
2. `product-lib`: include `src/lib/**`, `src/components/**`,
   `src/islands/**`, `src/layouts/**`, `src/pages/**`, `src/config/**`,
   `src/styles/**`, `astro.config.mjs`, `tailwind.config.cjs`;
   commands `[["npm", "run", "typecheck"], ["npm", "run", "lint"], ["npm", "run", "test"]]`.
   (Rationale: code edits need types, lint, unit tests; build/budgets stay in
   the full gate.)
3. `product-tests`: include `tests/unit/**`, `tests/output/**`,
   `vitest.config.ts`; commands `[["npm", "run", "test"]]`.

Do NOT add overlapping globs that would double-run the same command via union
dedupe surprises — check Step 1 semantics first. Keep JSON formatting
consistent with the file (2-space indent).

**Verify**: `node -e "JSON.parse(require('fs').readFileSync('.pi/verification.json','utf8')); console.log('json ok')"` → `json ok`.

### Step 3: Prove routing per file class

Run `--plan` for one representative of each new route and confirm the
fallback is NOT selected:
- `node scripts/verify-affected.mjs --file src/content/lessons/01-intro-to-calculus.mdx --plan`
- `node scripts/verify-affected.mjs --file src/lib/math.ts --plan`
- `node scripts/verify-affected.mjs --file tests/unit/math.test.ts --plan`

**Verify**: each prints its route's commands; none prints `scripts/verify.sh`.

### Step 4: Run the router's own tests plus a cheap product check

**Verify**: `node --test tests/verify-affected.test.mjs` → all pass; and
`node scripts/verify-affected.mjs --file src/lib/math.ts` (executing, not
`--plan`) → exit 0.

## Test plan

- No new product tests: this change adds router data, not behavior. The
  existing `tests/verify-affected.test.mjs` is the regression net.
- If that test file asserts an exact route count or id list and fails, extend
  it minimally to include the new ids (distinct gap: new routes unlisted).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --test tests/verify-affected.test.mjs` exits 0
- [ ] `--plan` for a `src/content/**`, a `src/lib/**`, and a `tests/unit/**` path each prints route commands, none prints the fallback
- [ ] No files outside `.pi/verification.json` (plus the test file only if Step 4 required it) are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The live `.pi/verification.json` schema differs from "Current state" (e.g. commands are not argv arrays) — the route shape in this plan is wrong.
- `scripts/verify-affected.mjs` matching semantics make the suggested globs match harness files too (over-broad union) — report the overlap instead of guessing.
- The router test asserts a closed route set and the failure suggests the team wants no product routes — that contradicts this plan's premise.

## Maintenance notes

- When new top-level product dirs appear, add them to the matching route's `include`; when a new check script is added, wire it here.
- Reviewers: confirm no route duplicates expensive gates (build/budgets belong in `npm run ci`, not per-edit loops).
- Follow-up explicitly deferred: wiring browser QA scripts into routing (they need a running `preview` server; not routable per-file).
