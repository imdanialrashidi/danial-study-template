# Plan 008: Align theme config names and drop the ignored `secondary` role

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/types.ts src/lib/themes.ts src/config/course.ts docs/CONTENT-CONTRACT.md`
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

A course author reading the types finds `theme.colors.secondary` — setting it
does nothing, silently. And the deep-role override is `primaryHover` in the
type but `primaryDeep` in every preset, token, and CSS variable, so an author
writing the "obvious" `primaryDeep` gets no error and no effect. Two papercuts
that punish exactly the customization the template advertises
(`docs/CONTENT-CONTRACT.md` §3, `docs/DESIGN.md` accent-override rule).

## Current state

- `src/lib/types.ts:60-72` (`ThemeConfig`): `colors: { primary?; primaryHover?; secondary?; accent? }`.
- `src/lib/themes.ts:91`: `primaryDeep: colors.primaryHover ?? preset.primaryDeep` — the ONLY read of a custom deep role; `secondary` is never read anywhere (verify in Step 1).
- `src/lib/themes.ts:23-65`: presets expose `primaryDeep`; `themeStyleAttribute` (line ~102) emits `--course-rgb-primary-deep`.
- `docs/CONTENT-CONTRACT.md` §3: "rewrites only `--color-primary` and `--color-accent`"; `src/config/course.ts` uses `colors: {}` with a comment pointing at presets.
- Convention guard (`docs/QUALITY.md` #15): courses theme only via `theme.colors`; forking `theme.css` is a defect — keep that invariant.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npm run test` | all pass (incl. `resolvedTheme` cases in `template-slice.test.ts`) |
| Lint      | `npm run lint` | exit 0 |
| Validate  | `npm run validate` | `No content errors found.` |

## Scope

**In scope** (the only files you should modify):
- `src/lib/types.ts` (rename + deprecate + remove)
- `src/lib/themes.ts` (resolution update)
- `docs/CONTENT-CONTRACT.md` (§3 theme-override snippet only)
- `src/config/course.ts` (comment touch-up only, if it names the old field)

**Out of scope** (do NOT touch, even though they look related):
- `src/styles/theme.css` and presets' values — the palette is untouched.
- Any component or island — token names are unchanged.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Single commit; short imperative message.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove `secondary` is write-only (read-only)

Grep `\.secondary` and `secondary` across `src/`, `scripts/`, `tests/` (excluding
unrelated words like `secondaryHref`/`secondaryLabel` in `site.ts`). Expect:
type declaration + zero readers.

**Verify**: no reader exists. If anything reads `colors.secondary`, STOP
(it does something after all).

### Step 2: Rename with a backward-compatible alias, drop `secondary`

In `src/lib/types.ts`: rename `primaryHover?` → `primaryDeep?`; keep
`primaryHover?` as `@deprecated` alias ("use `primaryDeep`"); DELETE
`secondary?` with a comment that only primary/accent roles exist.
In `src/lib/themes.ts` `resolvedTheme()`: resolve
`colors.primaryDeep ?? colors.primaryHover ?? preset.primaryDeep`
(one-line back-compat; remove the alias in a future major, note it inline).
Update the §3 snippet/comment in `docs/CONTENT-CONTRACT.md` and the
`src/config/course.ts` comment ONLY if they name the old field — keep edits
to the naming lines.

**Verify**: `npm run typecheck` → 0; `npm run lint` → 0.

### Step 3: Prove both spellings work, run the gates

Add NO permanent test (existing `resolvedTheme` cases in
`tests/unit/template-slice.test.ts` cover defaults + hex shape). Instead,
run a throwaway `node -e`? The resolver imports course config — simpler:
temporarily set `colors: { primaryDeep: '#123456' }`? Do NOT edit course
config permanently. Use `npx vitest run` with an inline test? Overkill —
the two-line resolution is covered by typecheck + existing tests.

**Verify**: `npm run test` → all pass; `npm run validate` → clean.

## Test plan

- No new test: behavior for all existing configs is byte-identical
  (alias preserves `primaryHover`; nobody could have used `secondary`
  observably since it was unread). Existing `resolvedTheme` tests are the net.
- If you doubt it, do a throwaway (not committed) vitest run asserting the
  alias — then delete it.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "colors\.secondary\|\.primaryHover" src/ | grep -v deprecated` shows only the alias line in `themes.ts`
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run validate` all exit 0
- [ ] `git status` shows only in-scope files; no value/hex changed anywhere (`git diff | grep -E "^[-+].*#[0-9a-fA-F]{6}"` returns nothing)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 finds a `secondary` reader — the premise is wrong; report the file.
- Any committed course config in the repo uses `secondary` or `primaryHover` with an expectation this plan breaks — report instead of "fixing" the config.
- The contract doc describes MORE customizable roles than primary/accent — the doc, not the type, may be the thing to fix; stop and report.

## Maintenance notes

- Remove the `primaryHover` alias in the next coordinated major (note is inline).
- Reviewers: confirm zero hex-value changes — this plan renames only.
- Deferred: per-course motif art beyond two roles — see direction spike plan 012, not here.
