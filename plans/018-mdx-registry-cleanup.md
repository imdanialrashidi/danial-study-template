# Plan 018: Retire the duplicate MDX registry and resolve the registry fiction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/config/mdx-components.ts src/lib/mdx.ts src/lib/render.ts src/islands/registry.ts src/islands/course/README.ts docs/CONTENT-CONTRACT.md src/layouts/ContentLayout.astro src/pages/glossary/index.astro`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S (registry decision is M if the maintainer chooses
  registry-as-code — see Step 1; default is registry-as-docs, S)
- **Risk**: LOW for the default path (deletions + doc updates; no callers)
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

Two "add a component here" contracts contradict each other: `src/lib/mdx.ts`
uses Astro wrappers carrying `client:*`; `src/config/mdx-components.ts`
imports raw `StepReveal` + `Quiz` islands that render static HTML but never
respond — the exact failure `Quiz.astro`'s header warns about. Anyone
following the `config` file ships a dead quiz. Separately, the documented
extension contract ("the registry is the only coupling point") is false:
every island is wired by direct import and `getIsland` has zero callers.

## Current state

- `src/lib/mdx.ts:13-25` — correct registry: Astro wrappers (`Quiz.astro`,
  `StepReveal.astro`, `ParamLab.astro` carrying `client:*`). Re-exported via
  `src/lib/render.ts:1-3,20-21`; used by `ContentLayout.astro:18,162` and
  `glossary/index.astro:6,100`.
- `src/config/mdx-components.ts:1-32` — duplicate: same Astro components
  except `:17-18` importing raw `../islands/common/StepReveal` + `Quiz`
  (no `client:*` possible from MDX prose). Exports `components` (not
  `mdxComponents`). Zero importers (verified: no `config/mdx-components`,
  `@config`, or `mdx-components` import anywhere; only the `astro.config.mjs:64`
  alias *definition*, with zero `@config` uses repo-wide).
- `src/islands/registry.ts:9-19` docstring claims "the core layout never
  imports an island directly"; reality: `ContentLayout.astro:11`
  (`ProgressToggle`), `CourseLayout.astro:12` (`BookmarkToggle`),
  `search.astro:3` (`SearchIsland`), `index.astro:19` (`CourseProgress`) all
  import directly. `getIsland` (`registry.ts:58-59`) has zero callers.
- `docs/CONTENT-CONTRACT.md:294-301` mandates registry registration as step 2
  of adding an island ("2. Register it in `src/islands/registry.ts`") — any
  retirement MUST update this section or the drift returns. The contract's
  step-3 warning ("Step 3 is not optional", `:303-306`) stays true regardless.
- `src/islands/course/README.ts:1-12` repeats the fiction ("the registry is
  the only coupling point") and exports nothing.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass            |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/config/mdx-components.ts` (delete, or reduce to a re-export — Step 1)
- `src/islands/registry.ts` (delete or rewrite docstring — Step 1)
- `src/islands/course/README.ts` (replace with pointer, no fake module)
- `docs/CONTENT-CONTRACT.md` (`## 8. Add an interactive island` only)

**Out of scope** (do NOT touch, even though they look related):
- `src/lib/mdx.ts`, `src/lib/render.ts` — the surviving registry, untouched.
- Any island, layout, or page — no rewiring in the default path.
- `astro.config.mjs` vite aliases (plan 020 owns dead-alias cleanup).

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Decide registry-as-docs (default) — confirm no hidden importers

Run: `grep -rn "islands/registry\|getIsland\|config/mdx-components\|@config" src/
tests/ scripts/ docs/ --include="*.ts" --include="*.tsx" --include="*.astro"
--include="*.mjs" --include="*.md"`. Expected: only the definition files,
`CONTENT-CONTRACT.md:299`, and `course/README.ts`. If a real importer appears
outside those, STOP (dead-ness premise wrong) and report it.

Decision rule: default to **registry-as-docs** (delete `registry.ts`, keep
Astro wrappers as the pattern) unless the grep finds a consumer. Do NOT build
registry-as-code (layouts resolving via `getIsland`) in this plan — that is an
M-sized redesign needing its own plan.

**Verify**: grep output recorded in the commit message.

### Step 2: Delete the duplicate map, keep compat

- Delete `src/config/mdx-components.ts` — UNLESS the Step 1 grep (or course
  forks you cannot see) suggests external imports of that path, in which case
  reduce it to `export { mdxComponents as components } from '../lib/mdx';`
  with a deprecation comment. Prefer deletion; the zero-importer evidence
  supports it.
- If deleting `registry.ts`: remove the file; update `course/README.ts` to a
  short pointer (no `export {}` fake module — use a `.gitkeep` + pointer
  comment or a real one-paragraph README without code).
- If keeping `registry.ts` as documentation: rewrite its docstring to describe
  the real wrapper pattern and mark `getIsland` deprecated.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Update the contract

Rewrite `docs/CONTENT-CONTRACT.md` `## 8` steps to the real flow:

1. Create `src/islands/course/<Name>.tsx`.
2. Create the Astro wrapper in `src/components/educational/` with `client:*`.
3. Add the wrapper to `src/lib/mdx.ts`.

Remove the "Register it in `src/islands/registry.ts`" step; keep the
"Step 3 is not optional" hydration warning verbatim (still true). If
`registry.ts` was kept as docs, mention it as an index, not a wiring point.

**Verify**: `npm run validate` → green; `npm run build` → exit 0;
`npm run test` → all pass; `npm run lint` → exit 0.

## Test plan

- No new tests (deletions + docs). Evidence: full gates green + build output
  identical (MDX pages render through the untouched `lib/mdx.ts` map).
- Optional strength: `diff <(build before) <(build after)` on `dist/` — expect
  no content changes.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck`, `npm run test`, `npm run validate`,
      `npm run lint`, `npm run build` all exit 0
- [ ] `src/config/mdx-components.ts` deleted or a one-line re-export
      (no raw-island imports remain: `grep -rn "islands/common"
      src/config/` empty)
- [ ] `grep -rn "getIsland" src/ --include="*.astro" --include="*.tsx"`
      shows no callers; registry deleted or documented as non-wiring
- [ ] `docs/CONTENT-CONTRACT.md` `## 8` no longer mandates registry
      registration, still carries the hydration warning
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- Step 1 grep finds a real importer of `registry.ts`/`config/mdx-components.ts`
  (dead-ness premise false).
- The maintainer prefers registry-as-code — stop and ask for a new plan
  rather than building lazy-loading inside this cleanup.
- Any MDX page renders differently after the change (compare `dist/`).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Future islands follow wrappers-only; reviewers: reject PRs adding raw
  island imports to any component map.
- If a plugin system is ever wanted, it needs its own design plan — do not
  resurrect `registry.ts` as a halfway step.
- `docs/CONTENT-CONTRACT.md` is the enforcement layer for authors/agents
  until a lint rule exists; keep it exact.
