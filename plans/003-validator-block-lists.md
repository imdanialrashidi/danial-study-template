# Plan 003: Teach the content validator YAML block lists

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- scripts/validate-content.mjs src/content`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `cba55e1`, 2026-10-07

## Why this matters

`scripts/validate-content.mjs` is the cross-file gate (missing refs, bad
sections, the LaTeX trap). But its hand-rolled frontmatter reader silently
turns any YAML block list into `[]`. An author writing the natural form
(`prerequisites:` + `- limit` lines) gets a green check while references are
never examined — broken prerequisite/formula links ship despite the gate.

## Current state

- `scripts/validate-content.mjs` `parseFrontmatter` (lines ~60–103): iterates
  `body.split(/\r?\n/)`, matches only top-level `key: value` lines
  (`/^([A-Za-z_][A-Za-z0-9_]*):[ \t]*(.*)$/`). Inline `[a, b]` goes through
  `parseList` (lines ~75–82); a bare key hits the `value === ''` branch
  (lines ~95–97):
  ```
      } else if (value === '') {
        // A key with a nested block below it; collect simple `- item` children.
        data[key] = [];
  ```
  The comment promises collection; the code assigns `[]` and moves on.
- Downstream, `entry.data.prerequisites ?? []` etc. then validate an empty
  list — no error, no warning.
- `docs/CONTENT-CONTRACT.md` §4 shows inline lists (`prerequisites: [limit]`);
  block lists are valid YAML an author or AI will plausibly write.
- Conventions: validator output groups errors/warnings, exits non-zero on
  errors; gates are `node scripts/validate-content.mjs` / `npm run validate`.
  No JS test file covers this script — verification below uses a temporary
  fixture entry (created, then deleted) for red-green proof.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Validate  | `npm run validate` (or `node scripts/validate-content.mjs`) | `No content errors found.`, exit 0 |
| Unit tests | `npm run test` | all pass |

## Scope

**In scope** (the only files you should modify):
- `scripts/validate-content.mjs`

**Out of scope** (do NOT touch, even though they look related):
- `src/content.config.ts` (Zod schemas already handle both YAML forms — the per-entry gate is fine).
- Any file under `src/content/` except one TEMPORARY fixture you create and delete within this plan.
- Adding a YAML dependency — fix the small reader instead (see steps).

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit per logical unit (`fix validator` + verification); short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reproduce with a temporary fixture (red)

Create `src/content/lessons/zz-validator-probe.mdx` with valid base
frontmatter (copy the header of `01-intro-to-calculus.mdx`: `type: lesson`,
`section: foundations`, etc.) but with block-list references, one pointing at
a missing entry:
```yaml
prerequisites:
  - limit
  - no-such-entry-xyz
```
Run `node scripts/validate-content.mjs` → expect exit non-zero AND an error
naming `no-such-entry-xyz`. Today it passes silently (the bug).

**Verify**: current (broken) run exits 0 with `No content errors found.` —
record this as the failing baseline. If it already errors, STOP (premise wrong).

### Step 2: Collect `- item` children for bare keys

In `parseFrontmatter`, index-iterate the lines so that when `value === ''`,
you scan the following lines while they match /^\s+-\s+(.*)$/ (indented dash
items), collecting `unquote(item)` values, stopping at the first line that is
a new top-level `key:` (or end of block). Rules:
- Only dash-list children; nested maps without dashes stay `[]` (current behavior).
- Reuse `unquote` per item so quoted `'a'`/`"a"` still work.
- A `- ` line at zero indentation ends the scan (it is not a child).
- Keep inline `[a, b]` handling byte-identical.

**Verify**: re-run with the probe fixture → exit non-zero with
`reference to missing or ambiguous content "no-such-entry-xyz"`.
Then change the probe's bad ref to a real slug (`limit`) → validator passes
for that file. If EITHER fails, fix before proceeding.

### Step 3: Remove the probe and run the gates

Delete `src/content/lessons/zz-validator-probe.mdx` (it must not remain).

**Verify**: `npm run validate` → `No content errors found.`, exit 0; then
`npm run test` → all pass.

## Test plan

- No permanent new test file: the script has no JS harness and the red-green
  proof above (temporary fixture, created then deleted) is the defect-sensitivity
  evidence. The fixture file must not exist at the end.
- Existing net: `npm run validate` over the 11 real entries + `npm run test`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] With a temporary block-list fixture pointing at a missing slug, the validator exits non-zero naming that slug (re-run once to confirm, then delete the fixture — final state must not contain it)
- [ ] `npm run validate` exits 0 with no errors on the real content
- [ ] `npm run test` exits 0
- [ ] `git status` shows only `scripts/validate-content.mjs` modified (fixture gone)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 already errors (block lists already work) — the codebase drifted; do not "fix" further.
- Real content uses multi-line flow lists (`[\n a,\n b\n]`) that your scanner mishandles — report the exact frontmatter instead of extending the parser.
- Fixing this suggests adding a YAML dependency — STOP; the plan mandates the small-reader fix, and a new dependency needs human approval.

## Maintenance notes

- Future parser changes must handle BOTH inline and block lists; reviewers: any new frontmatter list key needs both forms exercised with the temporary-fixture trick.
- Deferred: replacing the hand reader with a real YAML parser (rejected for now — one more dependency for a 40-line reader; revisit if a third YAML shape appears).
- `docs/CONTENT-CONTRACT.md` §4 examples remain valid (inline form); optionally show the block form there — cosmetic, not required by this plan.
