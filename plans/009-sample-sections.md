# Plan 009: Trim the sample course to the sections it actually uses

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/config/course.ts src/content src/pages/index.astro tests/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

The shipped sample declares four sections (`foundations`, `calculus`,
`physics`, `practice`) but all 7 sectioned entries live in `foundations`
(the other 4 entries are section-less glossary). The homepage silently
filters empties (`index.astro` filters `entries.length > 0`), so learners see
nothing wrong — but every new author copying the sample inherits three
mystery sections and a sample that never demonstrates multi-section ordering.
One honest section (plus a comment showing how to grow) teaches more.

## Current state

- `src/config/course.ts` lines ~34–53: four sections — `foundations`
  (مبانی), `calculus` (حساب دیفرانسیل و انتگرال), `physics` (فیزیک),
  `practice` (تمرین).
- `grep section: src/content/*/*.mdx` → 7× `foundations`, 0 elsewhere;
  glossary entries carry no `section` (by schema design).
- `src/pages/index.astro`: `const sections = (await getSectionGroups()).filter((s) => s.entries.length > 0)` — empties never render (verified), so trimming config changes no rendered output.
- `scripts/validate-content.mjs` errors when zero sections exist — one
  remaining section keeps that guard meaningful.
- No test asserts a section count (verify in Step 1).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Validate  | `npm run validate` | `No content errors found.` |
| Unit tests | `npm run test` | all pass |
| Typecheck | `npm run typecheck` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/config/course.ts` (sections array + comment only)

**Out of scope** (do NOT touch, even though they look related):
- Any file under `src/content/` — sample entries are unchanged.
- `src/pages/index.astro`, layouts, roadmap — rendering already handles this.
- `docs/*` — no doc names the four sample sections (verify by grep; if one does, STOP).

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Single commit; short imperative message.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove nothing depends on the empty sections (read-only)

Grep `calculus|physics|practice` (as section ids) across `src/`, `tests/`,
`docs/`, `scripts/` — expecting only the `course.ts` declarations (plus
unrelated prose like tag names or `practice/` ROUTE references, which are
collection URLs, not section ids — distinguish carefully).

**Verify**: no content entry, test, or doc references those three section
ids. Otherwise STOP and report the file.

### Step 2: Trim to `foundations` with a growth comment

Keep only the `foundations` section object, byte-identical. Above the
`sections` array, leave a 2-line comment: new courses add sections here;
every entry's `section` must match an id (validator enforces it). Do not
reorder fields, do not touch theme/features.

**Verify**: `npm run validate` → `No content errors found.`

### Step 3: Run the gates and confirm identical output

**Verify**: `npm run test` → all pass; `npm run typecheck` → 0. Optional
strong check: `npm run build` then confirm homepage still lists the same 7
trackable entries (counts in the catalogue strip unchanged).

## Test plan

- No new test: config trim with provably identical rendered output
  (homepage filter already excluded the empties). Existing validator + unit
  suite are the net.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rh "^section:" src/content/*/*.mdx | sort -u` output is unchanged (foundations only + glossary none)
- [ ] `npm run validate`, `npm run test`, `npm run typecheck` all exit 0
- [ ] `git status` shows only `src/config/course.ts` modified, diff limited to the sections array + comment
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds a real dependency (entry, test, or doc referencing the removed ids) — report it; the trim is wrong.
- Any doc (e.g. `README-COURSE.md`, `AI-CONTENT-PROMPT.md`) shows a four-section example that would now disagree — report; docs update needs owner voice.
- The validator's section guard or homepage breaks with one section — report; do not redesign.

## Maintenance notes

- When the sample course grows a genuine second section, re-add it WITH entries — never an empty declared section.
- Reviewers: output-identical config cleanup; no learner-visible change by design.
- No follow-up deferred.
