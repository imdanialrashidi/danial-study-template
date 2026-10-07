# Plan 004: Prefix image and definition URLs with the deployment base

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat cba55e1..HEAD -- src/lib/remark-base-links.mjs astro.config.mjs`
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

On a GitHub Pages project-site deploy, every root-absolute URL must carry the
base (`/repo`). `remarkBaseLinks` (registered in `astro.config.mjs` for both
`markdown` and `mdx`) rewrites Markdown links and string JSX `href`s — but not
Markdown images (`![alt](/images/x.png)`, mdast type `image`) or reference
definitions (`[id]: /target`, type `definition`). The first course that adds an
image or a reference-style link gets a green build with 404ing assets on
project sites.

## Current state

- `src/lib/remark-base-links.mjs` `walk()` (lines 44–60): handles
  `node.type === 'link'` (`node.url = prefix(...)`) and
  `mdxJsxFlowElement`/`mdxJsxTextElement` string `href` attributes only.
  No `image`, no `definition` case.
- `prefix(value, base)` (lines 23–30): no-ops on empty base and on
  non-root-absolute values (`/^\/(?!\/)/`), so extending it to more node types
  cannot affect root deployments.
- Registered twice in `astro.config.mjs`: `markdown.remarkPlugins` and
  `mdx({ remarkPlugins: ... })` with `{ base: basePath }`.
- Repo conventions: authors write clean `/...` paths; base applied by tooling.
  Markdown GFM is enabled (`markdown: { gfm: true }`).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Plugin test | `node --test tests/scripts/remark-base-links.test.mjs` | all pass (file created in Step 2) |
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests | `npm run test` | all pass |
| Validate  | `npm run validate` | `No content errors found.` |

## Scope

**In scope** (the only files you should modify):
- `src/lib/remark-base-links.mjs`
- `tests/scripts/remark-base-links.test.mjs` (create; tiny regression net for the plugin)

**Out of scope** (do NOT touch, even though they look related):
- `astro.config.mjs` — registration is already correct.
- Expression-valued JSX attributes (`href={"/x"}`) — authors don't write them; leave alone.
- `src/lib/url.ts` (`withBase`) — the `.astro` side already works.

## Git workflow

- Branch: per operator instruction (fixed `ai-changes` lane via
  `node scripts/ai-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm mdast shapes (read-only)

Check the installed mdast/remark versions' node types for images and
reference definitions: both carry a string `url` field (`image.url`,
`definition.url`; link titles/alt text must NOT be touched). A quick
`node -e` probe parsing `![a](/i/x.png)\n\n[x]: /target` with the repo's
remark stack is enough — or read the installed `@types/mdast` if present.

**Verify**: you can cite the `url` field name for both types from the probe or
the type package. If either type lacks `url`, STOP (premise wrong).

### Step 2: Extend `walk()` and add the regression test

In `walk()`, alongside the `link` branch, add:
```js
if ((node.type === 'image' || node.type === 'definition') && typeof node.url === 'string') {
  node.url = prefix(node.url, base);
}
```
Create `tests/scripts/remark-base-links.test.mjs` (check how sibling
`tests/*.test.mjs` import repo `.mjs` sources, then mirror the style) with
cases: image `/i/x.png` → `/base/i/x.png`; definition `/target` →
`/base/target`; anchor `#f` untouched; relative `i/x.png` untouched;
empty-base transformer is a no-op. Keep it dependency-free
(`node:test` + `node:assert/strict`, like the repo's other `.mjs` tests).

**Verify**: `node --test tests/scripts/remark-base-links.test.mjs` → all pass.
Then mutate-check: temporarily revert the plugin hunk and confirm the new
image/definition cases FAIL (then restore). This is the red-before-green proof.

### Step 3: Run the repo gates

**Verify**: `npm run typecheck` → exit 0; `npm run test` → all pass;
`npm run validate` → `No content errors found.`

## Test plan

- New file `tests/scripts/remark-base-links.test.mjs` (see Step 2): image,
  definition, anchor/relative/empty-base negatives, plus the red-check via
  temporary revert.
- Existing nets unchanged: unit suite + validator must stay green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `node --test tests/scripts/remark-base-links.test.mjs` exits 0 and fails on the unpatched plugin (verified via the temporary revert in Step 2)
- [ ] `npm run typecheck`, `npm run test`, `npm run validate` all exit 0
- [ ] `git status` shows only the two in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- mdast `image`/`definition` nodes in the installed toolchain do not expose a plain string `url` — the fix shape is wrong.
- Any existing content or test depends on UNprefixed image URLs (e.g. an absolute-URL convention) — report the file instead of rewriting it.
- The new test file's import style cannot resolve the plugin without new config — report; do not add loaders or deps.

## Maintenance notes

- If MDX/JSX link-ish attributes beyond `href` appear (e.g. `src`), they need
  the same treatment — reviewers: grep new MDX-usable components for URL props.
- Deferred: expression-valued attributes (`href={...}`) — revisit only when an
  author actually needs them.
