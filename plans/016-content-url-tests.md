# Plan 016: Unit-test link resolution, dependents, and URL helpers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/lib/content.ts src/lib/url.ts tests/unit tests/output/build-output.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/013-content-prereq-identity.md (pin the fixed behavior, not the bug)
- **Category**: tests
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

The most navigation-critical logic in the repo — reference resolution,
dependents, cross-links, related entries, base-prefixing — has zero unit
coverage. Finding #1 (dead dependents rail) shipped green for exactly this
reason. Pure-function tests with fabricated entries run in milliseconds and
catch regressions that otherwise need a full build to surface.

## Current state

- `tests/unit/` has four files (`math`, `utils`, `progress`, `template-slice`);
  none imports `src/lib/content.ts`. `src/lib/url.ts` (`withBase` `:25-35`,
  `stripBase` `:48-53`) has zero unit tests.
- `tests/output/build-output.test.ts:30-35` reimplements `stripBase` locally
  against `process.env.BASE_PATH` (`:28`), while `src/lib/url.ts:14` reads the
  base from `import.meta.env.BASE_URL`. A bare import would test the wrong
  base under vitest — this plan parameterizes around that (see Step 3).
- Targets: `resolveEntry` (`content.ts:200-216`) bare/qualified/ambiguous
  branches; `getDependents` (`:218-221`); `getCrossLinks` (`:273-316`);
  `getRelatedEntries` (`:232-257`, incl. the exclusion set built from
  cross-links at `:234-242`).
- Test pattern to follow: `tests/unit/template-slice.test.ts` imports pure
  lib functions and asserts behavior boundaries with Persian fixtures.
- `CourseEntry` shape: `project()` (`content.ts:92-126`) builds
  `{id, kind, qualifiedId, title, path, prerequisites, tags, ...}` — fabricate
  minimal objects of this shape cast to `CourseEntry`; do NOT call
  `getAllEntries()` (needs the Astro content layer).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test` (`vitest run tests/unit`) | all pass, incl. new file |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `tests/unit/content.test.ts` (create)
- `tests/unit/url.test.ts` (create)
- `tests/output/build-output.test.ts` (surgical: replace local `stripBase`
  with the parameterized helper — see Step 3)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/content.ts`, `src/lib/url.ts` — behavior is plan 013's; if a test
  exposes a further bug, STOP and report rather than fixing here.
- `src/lib/index.ts` barrel or new shared modules — no production moves.
- `vitest.config.ts` — no runner changes.

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `tests/unit/content.test.ts` — resolution branches

Fabricate a small entry list (two kinds sharing one slug for ambiguity, one
unique slug, one qualified-only slug, prerequisites as bare slugs per the
schema). Because `resolveEntry`/`getDependents`/`getCrossLinks` call
`getAllEntries()` internally (Astro content layer, unavailable in unit tests),
test through the synchronous seams instead:

- If plan 013 has landed, import and test whatever pure helpers it exposes
  (e.g. the prerequisite matcher, the strict reference parser).
- Otherwise, replicate the branch logic minimally: bare-prefer-same-kind,
  globally-unique fallback, ambiguous-returns-undefined, qualified-miss,
  multi-slash-reject, dependents-bare-slug, related-excludes-linked.
- Whichever seam you test, assert the *post-013 contract*: bare-slug
  prerequisites match; `a/b/c` is unresolved; ambiguous bare slug resolves to
  nothing.

Cases (minimum): bare-prefer-same-kind; globally-unique fallback;
ambiguous-bare → undefined; qualified miss → undefined; multi-slash reject;
dependents-bare-slug non-empty; related excludes explicit cross-links.

**Verify**: `npm run test` → all pass including the new file.

### Step 2: `tests/unit/url.test.ts` — base-prefix table

Table-test `withBase`/`stripBase` under root and `/base` deployments:
root passthrough, `/base` prefixing, external URLs untouched, `#anchor` and
`?query` untouched, protocol-relative untouched, `''` → base or `/`.
Follow `tests/unit/utils.test.ts` table style.

**Verify**: `npm run test` → all pass.

### Step 3: Remove the `stripBase` duplicate from output tests

`build-output.test.ts:28-35` defines a local `stripBase` over
`process.env.BASE_PATH`, but `src/lib/url.ts:14` reads
`import.meta.env.BASE_URL` — a bare import tests the wrong base under vitest.
Do NOT bare-import. Instead: extract the test's local function into a
two-argument pure helper `stripBaseWith(base, href)` — either exported from
`src/lib/url.ts` (preferred: `stripBase(pathname, base = basePath)` optional
second parameter, existing callers untouched) or defined once in the test
file and shared. Then replace both call sites (`:176`, `:215`) with it and
add one assertion that it agrees with the lib helper on a `/base` case.

**Verify**: `npm run test` → all pass; `BASE_PATH=/physics2 npm run test`
(or the repo's documented project-site reproduction) → output tests still
resolve correctly.

### Step 4: Run the repo gates

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass;
`npm run lint` → exit 0.

## Test plan

- New files `tests/unit/content.test.ts`, `tests/unit/url.test.ts` as above.
- Modified `tests/output/build-output.test.ts` (dedup only, no behavior
  change — full suite must stay green).
- Red proof: pick one new content test (dependents-bare-slug) and one url
  test, temporarily break the corresponding implementation line, confirm both
  FAIL (then restore).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0; `tests/unit/content.test.ts` and
      `tests/unit/url.test.ts` exist and pass
- [ ] `npm run lint` exits 0
- [ ] `grep -n "function stripBase" tests/output/build-output.test.ts`
      returns no matches (dedup complete, helper shared)
- [ ] Red proof performed for one content + one url case
- [ ] No production files modified (`git status` shows only the two new test
      files + the output-test edit, plus at most the optional `url.ts`
      parameterization)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Plan 013 has NOT landed: write the tests against the post-013 contract
  anyway, but mark them failing-as-expected and report — do not "fix" the
  implementation inside this test plan.
- `resolveEntry`'s Astro-layer coupling makes pure unit tests impossible
  without mocking `astro:content` — report rather than building a mock
  harness (mocks of the authority are forbidden by `docs/QUALITY.md`).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If new content kinds are added, extend the fabricated entry list — the
  ambiguity cases are the ones that catch real regressions.
- If `stripBase` gains the optional base parameter, document that production
  callers must keep using the default (runtime base), tests pass it explicitly.
- Future resolution changes must update these tests first (red-before-green).
