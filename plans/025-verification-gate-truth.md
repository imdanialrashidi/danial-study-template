# Plan 025: Make the full verification gate actually run and tell the truth

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- .github/workflows/quality.yml package.json package-lock.json CONTRIBUTING.md README-COURSE.md docs/QUALITY.md docs/ARCHITECTURE.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx + security (CI)
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

The workflow job named `verify` is the only place that runs typecheck, lint,
build, built-output tests, link validation, and budgets — and it runs
`bash scripts/verify.sh` on a clean runner **without installing dependencies**.
`verify.sh` immediately calls `npm run ci`, whose first command needs
`node_modules/.bin/astro`. The job therefore fails before doing any real
verification, while the separate `quick` job (which does install) can pass.
`main` pushes and the PR backstop get no full-gate signal.

A second, independent problem: the script named `ci` — documented as the
“Full gate” — omits `npm run validate`, while the lighter `check` lane includes
it. A change can pass the full gate while content references are broken.

This plan repairs the gate itself. Every later plan depends on trustworthy
verification, so land this first.

## Current state

- `.github/workflows/quality.yml`
  - `quick` job (lines 19–38) installs with `npm ci` and runs
    `npm run validate && npm run test`.
  - `verify` job (lines 41–56) checks out, sets up Node with `cache: npm`,
    then runs `bash scripts/verify.sh`. There is **no install step**.
- `scripts/verify.sh:59–65` runs `npm run ci` when `package.json` exists.
- `package.json`:
  - line 14 — `check`: validate + typecheck + lint + test + build + test:dist
    + validate:links + budgets.
  - line 33 — `ci`: the same chain **without** `npm run validate`.
- `eslint.config.mjs:6` imports `@eslint/js`, but `package.json` does not
  declare it. It resolves today only because npm hoists ESLint’s transitive
  dependency; `scripts/ci-install.sh` explicitly supports pnpm/Yarn, where
  strict hoisting makes `npm run lint` fail with `ERR_MODULE_NOT_FOUND`.
- `CONTRIBUTING.md:7–10` tells contributors to run `bash scripts/verify.sh`
  without first installing packages.
- Documentation drift:
  - `README-COURSE.md:110` says `tests/unit/` contains “unit + build-output
    tests”; the built-output suite is `tests/output/build-output.test.ts`.
  - `README-COURSE.md:150` says `npm run test` runs unit + build-output; it
    runs `vitest run tests/unit` only (`package.json:18`).
  - `docs/QUALITY.md:168,195,232` cite `tests/unit/build-output.test.ts`.
  - `docs/ARCHITECTURE.md:96` says the Unit gate covers the built-output
    contract; it does not.
- Canonical commands that must stay true after this plan:
  `npm run validate`, `npm run typecheck`, `npm run test`,
  `npm run test:dist`, `npm run lint`, `npm run build`, `npm run budgets`,
  `npm run ci`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install (repo helper) | `bash scripts/ci-install.sh` | exit 0 |
| Full gate | `npm run ci` | exit 0; output starts with `Checked 11 content entries` |
| Unit | `npm run test` | all tests pass |
| Built output | `npm run test:dist` | all tests pass |
| Lint | `npm run lint` | exit 0 |
| YAML parse | `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/quality.yml','utf8')); console.log('yaml ok')"` | prints `yaml ok` |

## Scope

**In scope** (the only files you should modify):
- `.github/workflows/quality.yml`
- `package.json`
- `package-lock.json` (only through the install command in Step 2)
- `CONTRIBUTING.md`
- `README-COURSE.md`
- `docs/QUALITY.md`
- `docs/ARCHITECTURE.md`

**Out of scope** (do NOT touch):
- `.github/workflows/deploy.yml` — deploy permissions and gating are a separate
  finding, not part of this plan.
- `scripts/verify.sh` — its logic is already correct for this repository.
- Source code under `src/`, content under `src/content/`, tests.
- The decision to upgrade Astro/React/Tailwind/Vitest — see plan 010’s status
  in `plans/README.md`; do not fold an upgrade into this repair.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`. If the operator asks for delivery, keep this
change as one logical commit.

## Steps

### Step 1: Install dependencies in the verify job

In `.github/workflows/quality.yml`, in the `verify` job, add a step after
`Set up Node` and before `Run verification gate`:

```yaml
      - name: Install dependencies
        run: bash scripts/ci-install.sh
```

Keep the existing `run: bash scripts/verify.sh` step unchanged. Do not replace
the helper with `npm ci`: `ci-install.sh` already handles this repository’s
npm lockfile and preserves the template’s pnpm/Yarn support.

**Verify**:
`node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/quality.yml','utf8')); console.log('yaml ok')"`
→ `yaml ok`
`grep -n "ci-install.sh" .github/workflows/quality.yml` → one match in the
`verify` job.

### Step 2: Declare `@eslint/js` directly

Run:

```bash
npm install --save-dev @eslint/js@^9.0.0
```

This updates `package.json` and `package-lock.json`. Do not hand-edit the
lockfile.

**Verify**:
`npm ls @eslint/js --depth=0` → prints `@eslint/js@9.x` with no
`UNMET`/`missing` marker.
`npm run lint` → exit 0.

### Step 3: Make `ci` include content validation, with one source of truth

Edit `package.json`:

- Change `ci` to start with `npm run validate`:
  `"ci": "npm run validate && npm run typecheck && npm run lint && npm run test && npm run build && npm run test:dist && npm run validate:links && npm run budgets"`.
- Change `check` to `"check": "npm run ci"` so the two documented lanes
  cannot drift again. (`check` is still a valid command; it now delegates.)

Do not change `verify:fast`, `verify:feature`, or `verify:full` semantics
beyond `verify:full` continuing to call `ci`.

**Verify**: `npm run ci` → exit 0. The first line of output must be the content
validator (`Checked 11 content entries in 6 collections.`), proving validation
is in the chain.

### Step 4: Correct the documented gates

Make the docs match the commands:

- `CONTRIBUTING.md` Setup: add an explicit install step before the verify step:
  `npm ci` (or `bash scripts/ci-install.sh`).
- `README-COURSE.md`:
  - Replace `tests/unit/      unit + build-output tests` with two lines:
    `tests/unit/      unit tests` and `tests/output/    built-output tests`.
  - Replace `npm run test              # unit + build-output tests` with
    `npm run test              # unit tests` and add
    `npm run test:dist         # built-output tests`.
  - Keep `npm run ci # all of the above`; after Step 3 it is true.
- `docs/QUALITY.md`:
  - Replace every `tests/unit/build-output.test.ts` with
    `tests/output/build-output.test.ts`.
  - In the canonical commands table, keep `npm run check` and add a row for
    `npm run test:dist` (“built-output contract”).
- `docs/ARCHITECTURE.md` verification table:
  - Unit row: describe `npm run test` as pure logic only.
  - Add an Output row: `npm run test:dist` — built-output contract (RTL,
    single `h1`, creator identity, link resolution).

**Verify**:
`grep -rn "tests/unit/build-output" docs README-COURSE.md` → no matches.
`grep -n "test:dist" README-COURSE.md docs/QUALITY.md docs/ARCHITECTURE.md`
→ each file mentions the built-output lane.

### Step 5: Prove the repaired gate end to end

Run the full gate from a clean dependency state:

```bash
bash scripts/ci-install.sh
npm run ci
```

**Verify**: exit 0. Record the tail of the output in the PR/commit evidence.
Then run the YAML parser and the drift checks in "Done criteria".

## Test plan

No new unit test is warranted: this plan changes CI wiring and documentation.
The regression evidence is the executed full gate (`npm run ci`), the YAML
parse, and the existence of `@eslint/js` as a direct dependency. If the
executor wants a cheap structural guard, add a single assertion to
`tests/unit/template-slice.test.ts` that reads `package.json` and asserts
`scripts.ci` contains `validate`; this is optional and must not replace the
executed-gate evidence.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `.github/workflows/quality.yml` `verify` job contains
      `bash scripts/ci-install.sh` before `bash scripts/verify.sh`
- [ ] YAML parses: the `js-yaml` command in "Commands you will need" prints
      `yaml ok`
- [ ] `package.json` declares `@eslint/js`; `npm ls @eslint/js --depth=0`
      exits 0
- [ ] `node -e "const p=require('./package.json'); if(!p.scripts.ci.includes('validate')) process.exit(1); console.log('ci includes validate')"`
      prints `ci includes validate`
- [ ] `grep -rn "tests/unit/build-output" docs README-COURSE.md` returns no
      matches
- [ ] `npm run ci` exits 0 and its output begins with the content validator
- [ ] `npm run lint` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `npm run ci` fails for a reason unrelated to this change (record the exact
  command and failure; do not weaken, skip, or delete a check to get green).
- Adding `@eslint/js` as a direct dependency changes the resolved ESLint
  ecosystem version and causes lint failures; pin it to the version already
  installed (`npm ls @eslint/js` before the change) instead of upgrading.
- `scripts/ci-install.sh` fails on this repository (for example because a
  second lockfile exists); report the lockfile state instead of switching the
  workflow to a guessed package manager.
- The workflow YAML cannot be parsed by `js-yaml` (the module is available
  transitively today; if it disappears, report rather than installing a new
  dependency just for verification).

## Maintenance notes

- `check` and `ci` are now one chain. Future gate additions belong in `ci`
  only; `check` delegates. Keep `docs/QUALITY.md`’s canonical table in sync.
- `verify.sh` is the template-level fallback and intentionally runs `ci`; if
  the repository ever adds a `scripts/project-verify.sh`, that file wins by
  design.
- The `quick` job still installs with `npm ci` and runs validate + unit only.
  If CI cost becomes a problem, make `verify` run only on `main` rather than
  removing steps from it.
- Deploy is still independent of quality; that gap is deliberately not fixed
  here (see the audit’s unplanned findings).
