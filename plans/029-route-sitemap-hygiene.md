# Plan 029: Fix the glossary jump bar and keep noindex routes out of the sitemap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- src/pages/glossary/index.astro astro.config.mjs tests/output/build-output.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (plan 025 is recommended first so the gate is trustworthy)
- **Category**: bug + SEO
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

Two small route-level defects are visible in the built output:

1. **The glossary jump bar navigates to the homepage.** Every letter link is
   built as `withBase('/#letter-…')`, but the target `<section id="letter-…">`
   is on `/glossary`. Clicking «ت» sends the reader to `/#letter-ت`, where the
   fragment does not exist. The jump bar is unusable.
2. **`/saved` is in the sitemap despite being `noindex`.** `saved.astro` sets
   `noindex={true}`, and `astro.config.mjs` says only indexable routes belong
   in the sitemap, but the filter only removes `/search`. The built
   `sitemap-0.xml` currently contains `/saved/`, a contradictory signal to
   crawlers and a waste of crawl budget.

Both are one-line fixes with output-level regression tests.

## Current state

`src/pages/glossary/index.astro:73–76`:

```astro
{jumpTargets.map(({ letter, count }) => (
  <a
    href={withBase(`/#letter-${encodeURIComponent(letter)}`)}
```

The anchors are on the same page at line 86:

```astro
<section id={`letter-${encodeURIComponent(letter)}`} class="scroll-mt-24">
```

Built evidence:

```
dist/glossary/index.html: href="/#letter-%D8%AA"
dist/glossary/index.html: id="letter-%D8%AA"
```

`astro.config.mjs:46–55`:

```js
sitemap({
  // Suggest only indexable routes: the search page carries
  // `noindex, follow` and must never appear in the sitemap.
  // No `lastmod`: ...
  filter: (page) => {
    const pathname = new URL(page).pathname.replace(/\/+$/, '');
    return pathname !== `${basePath}/search`;
  },
}),
```

`src/pages/saved.astro:23` sets `noindex={true}`. Built evidence:

```
dist/sitemap-0.xml: <loc>https://imdanialrashidi.github.io/saved/</loc>
```

`tests/output/build-output.test.ts:257–264` checks the sitemap’s `lastmod`
behavior but never route exclusion; the glossary jump bar has no output test.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Built output | `npm run test:dist` | all pass |
| Base-path build | `BASE_PATH=/physics2 npm run build` | exit 0 |
| Base-path links | `BASE_PATH=/physics2 npm run validate:links` | `No content errors found.` |
| Full gate | `npm run ci` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/pages/glossary/index.astro`
- `astro.config.mjs`
- `tests/output/build-output.test.ts`

**Out of scope** (do NOT touch):
- `src/pages/saved.astro` / `src/pages/search.astro` — their `noindex` flags
  are correct; only the sitemap filter changes.
- `src/lib/url.ts` — `withBase` correctly leaves `#…` untouched; the bug is
  the leading `/` in the path, not the helper.
- The glossary grouping/rendering logic or the page’s copy.
- The Telegram popup / ClientRouter behavior — separate plan/finding.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`.

## Steps

### Step 1: Make the letter links same-page fragments

In `src/pages/glossary/index.astro:75`, replace:

```astro
href={withBase(`/#letter-${encodeURIComponent(letter)}`)}
```

with:

```astro
href={`#letter-${encodeURIComponent(letter)}`}
```

`withBase` would leave a `#…` string untouched anyway, but removing it makes
the same-document intent explicit. Keep the `withBase` import for the other
links on the page (entry links at line 97).

**Verify**: `npm run build` → exit 0.
`grep -o 'href="[^"]*#letter-[^"]*"' dist/glossary/index.html | head -3`
→ every result starts with `href="#letter-` (no leading `/`).
`grep -c 'id="letter-' dist/glossary/index.html` → greater than 0.

### Step 2: Exclude every noindex route from the sitemap

In `astro.config.mjs`, next to the `basePath` constant near the top, add:

```js
/** Routes that render `noindex` and must never appear in the sitemap. */
const noindexRoutes = ['/search', '/saved'];
```

Then replace the filter body:

```js
filter: (page) => {
  const pathname = new URL(page).pathname.replace(/\/+$/, '') || '/';
  return !noindexRoutes.some((route) => pathname === `${basePath}${route}`);
},
```

Keep the existing comment about `lastmod` unchanged. Do not add a dependency.

**Verify**: `npm run build` → exit 0.
`grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -E '/(search|saved)/?<'`
→ no output (exit status 1 from grep is the expected “no matches”).
`grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -c '/lessons/'` →
at least 1, proving the filter did not remove valid routes.

### Step 3: Add output regression tests

In `tests/output/build-output.test.ts`, add two cases near the existing
sitemap/saved tests:

```ts
it('keeps noindex routes out of the sitemap', () => {
  const xml = readFileSync(path.join(distDir, 'sitemap-0.xml'), 'utf8');
  expect(xml, 'sitemap must not contain /search').not.toMatch(/<loc>[^<]*\/search\/?<\/loc>/);
  expect(xml, 'sitemap must not contain /saved').not.toMatch(/<loc>[^<]*\/saved\/?<\/loc>/);
});

it('points glossary letter jumps at same-page anchors', () => {
  const html = readFileSync(path.join(distDir, 'glossary/index.html'), 'utf8');
  expect(html, 'glossary jump bar has no same-page letter target').toMatch(/href="#letter-/);
  expect(html, 'glossary jump bar still points at the homepage').not.toMatch(/href="\/#letter-/);
  expect(html, 'glossary letter anchors are missing').toContain('id="letter-');
});
```

The `sitemap-0.xml` filename is the Astro sitemap integration’s current output
(the existing tests already read it at line 254/260).

**Verify**: `npm run test:dist` → all pass, including the two new cases.

### Step 4: Prove the project-site deployment

Run:

```bash
BASE_PATH=/physics2 npm run build
BASE_PATH=/physics2 npm run validate:links
```

**Verify**: build exits 0; the link validator prints
`No content errors found.`

Then inspect the base-path sitemap:

```bash
grep -o '<loc>[^<]*</loc>' dist/sitemap-0.xml | grep -E '/(search|saved)/?<'
```

→ no output, even though every URL now carries `/physics2`.

Finally rebuild for the normal root deployment (`npm run build`) so the
working tree’s `dist/` is not left in a base-path state.

## Test plan

- Two new output tests in `tests/output/build-output.test.ts`: noindex route
  exclusion, and same-page glossary anchors.
- The tests read the real `dist/` output, so they catch the exact failure
  mode (a wrong `href` or a sitemap entry) rather than re-testing
  `withBase`/the filter in isolation.
- Red-before-green: before the fixes, the glossary test fails on
  `href="/#letter-"` and the sitemap test fails on `/saved/`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `npm run test:dist` exits 0, including the two new cases
- [ ] `grep -c 'href="/#letter-' dist/glossary/index.html` → `0`
- [ ] `grep -c 'href="#letter-' dist/glossary/index.html` → greater than 0
- [ ] `grep -E '/(search|saved)/?<' dist/sitemap-0.xml` → no matches
- [ ] `BASE_PATH=/physics2 npm run build && BASE_PATH=/physics2 npm run validate:links` exits 0
- [ ] `npm run ci` exits 0 (after rebuilding for the normal base)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The sitemap filter receives a URL shape other than an absolute URL parseable
  by `new URL(page)` (the existing code already assumes this; report a change
  rather than adding a second URL parser).
- `basePath` is set to `/` and the filter accidentally removes `/lessons` or
  `/`; inspect the exact pathnames and report. The `basePath` constant is
  already normalized to `''` for a root deployment, so this indicates a
  different environment shape.
- The glossary anchors move or are renamed; then the jump fix must follow the
  new anchor, not invent a new one. Report the new markup first.
- `BASE_PATH=/physics2 npm run validate:links` reports broken links caused by
  the same-page fragment change (it should not: `#…` is not an internal path).

## Maintenance notes

- `noindexRoutes` is the single list for sitemap exclusion. When a new
  `noindex` page is added, add its route there and extend the output test.
- Same-page fragments must stay fragment-only (`#…`); `withBase` is for
  site-absolute paths. The output test guards against the leading `/`
  regression.
- The sitemap still intentionally emits no `lastmod`; do not reintroduce a
  build-time stamp while touching this filter.
- The glossary page’s other links (entry links) still use `withBase`; keep
  them.
