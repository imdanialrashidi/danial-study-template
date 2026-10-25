# Plan 027: Make search work from a shared URL and survive the palette flag

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- src/layouts/BaseLayout.astro src/pages/search.astro src/islands/common/SearchIsland.tsx src/islands/common/searchIndex.ts src/lib/search.ts tests/unit/search.test.ts scripts/interaction-qa.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (plan 025 is recommended first so the gate is trustworthy)
- **Category**: bug + perf
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

Search has three independent defects that all come from where data is read:

1. **`?q=` is write-only.** `search.astro` reads `Astro.url.searchParams` at
   static build time, so the single generated `/search/index.html` always has
   `initialQuery: ''`. The island writes `?q=` on every keystroke but never
   reads it on mount. Every shared or bookmarked `/search?q=…` URL opens an
   empty search box.
2. **Disabling the palette kills search.** `BaseLayout` renders the
   `#site-search-index` payload only when
   `commandPalette && search`. `SearchIsland` reads only that payload and
   falls back to `[]`. A course that sets `features.commandPalette: false` but
   keeps `search: true` gets a `/search` page with zero results.
3. **ZWNJ spellings do not match.** `normalizePersian` deliberately preserves
   U+200C for tokenization, but search uses the same normalization for the
   index and the query. `می‌شود` never matches `میشود`, and `زنجیره‌ای`
   never matches `زنجیرهای`, despite the product promising keyboard-variant
   matching.

The fix is small and testable: read the query at runtime, gate the payload on
its actual consumers, and fold ZWNJ only in the search normalization path.

## Current state

`src/layouts/BaseLayout.astro:60–65`:

```astro
const showPalette = isEnabled('commandPalette') && isEnabled('search');
...
const sharedSearchIndex = showPalette ? buildSearchIndex(await getAllEntries()) : [];
const paletteIndex = Astro.props.searchIndex ?? sharedSearchIndex;
```

and lines 149–152 render both the payload and the palette under
`showPalette`:

```astro
{showPalette && (
  <script type="application/json" id="site-search-index" set:html={jsonForScript(paletteIndex)} />
)}
{showPalette && <CommandPalette />}
```

`src/pages/search.astro:8–12,33`:

```astro
const searchIndex = buildSearchIndex(await getAllEntries());
...
const initialQuery = Astro.url.searchParams.get('q') ?? '';
...
<SearchIsland client:load initialQuery={initialQuery} />
```

`src/islands/common/SearchIsland.tsx:37–41`:

```tsx
export default function SearchIsland({ items: ssrItems = [], initialQuery = '' }: SearchIslandProps) {
  const sharedItems = useMemo(() => readSiteSearchIndex(ssrItems), [ssrItems]);
  const items = typeof document === 'undefined' ? ssrItems : sharedItems;
  const [query, setQuery] = useState(initialQuery);
```

`src/islands/common/searchIndex.ts:22–25` returns the empty fallback when the
script element is absent.

`src/lib/search.ts` uses `normalizePersian` directly at lines 48–49 (haystack),
72 (title), 81 (tags), and 119–120 (query). `normalizePersian` intentionally
keeps U+200C (`src/lib/utils.ts:35–64`); `tokenize` relies on that, so do not
change `normalizePersian`.

Browser evidence already reproduced on the built site:

- `GET /search/?q=مشتق` → input empty, zero results.
- The payload is present on `/search` only because the sample has
  `commandPalette: true`.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `npm ci` | exit 0 |
| Unit | `npm run test` | all pass, incl. new ZWNJ cases |
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Preview | `npm run preview -- --port 4321` | serves the built site |
| Browser QA | `node scripts/interaction-qa.mjs --base http://localhost:4321` | all checks pass |
| Full gate | `npm run ci` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/layouts/BaseLayout.astro`
- `src/pages/search.astro`
- `src/islands/common/SearchIsland.tsx`
- `src/lib/search.ts`
- `tests/unit/search.test.ts`
- `scripts/interaction-qa.mjs`

**Out of scope** (do NOT touch):
- `src/lib/utils.ts` / `normalizePersian` / `tokenize` — the ZWNJ preservation
  is deliberate for tokenization; fold only in the search layer.
- `CommandPalette.tsx` / `CommandPaletteDialog.tsx` — palette focus and
  hydration are separate plans/findings.
- Search weights or ranking order — the existing pins must stay green.
- `src/content/**` — no content change is needed.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`.

## Steps

### Step 1: Gate the payload on its consumers, not the palette

In `src/layouts/BaseLayout.astro`, separate the three decisions:

```astro
const searchEnabled = isEnabled('search');
const showPalette = searchEnabled && isEnabled('commandPalette');
// The palette needs the payload on every page; the search page passes its own
// index down as a prop. If neither consumer exists, serialize nothing.
const needsSearchIndex = showPalette || Astro.props.searchIndex !== undefined;
const sharedSearchIndex =
  needsSearchIndex && Astro.props.searchIndex === undefined
    ? buildSearchIndex(await getAllEntries())
    : [];
const paletteIndex = Astro.props.searchIndex ?? sharedSearchIndex;
```

Then render:

```astro
{needsSearchIndex && (
  <script type="application/json" id="site-search-index" set:html={jsonForScript(paletteIndex)} />
)}
{showPalette && <CommandPalette />}
```

This fixes both the palette-off case and the double index build on `/search`
(the search page’s prop is reused).

**Verify**: `npm run build` → exit 0.
`grep -c 'id="site-search-index"' dist/search/index.html` → `1`.
Temporarily set `features.commandPalette: false` in `src/config/course.ts`,
run `npm run build`, and confirm:
`grep -c 'id="site-search-index"' dist/search/index.html` → `1` (payload
still present) and
`grep -c 'data-open-palette' dist/index.html` → `0` (palette trigger absent).
Then **revert** `src/config/course.ts` exactly; `git diff --exit-code src/config/course.ts`
must exit 0. If either grep fails, STOP.

### Step 2: Read `?q=` at runtime, not build time

In `src/pages/search.astro`:

- Delete `const initialQuery = Astro.url.searchParams.get('q') ?? '';` and the
  `initialQuery` prop on `<SearchIsland>`.
- Keep `searchIndex={searchIndex}` on `<BaseLayout>`.

In `src/islands/common/SearchIsland.tsx`:

- Import `useEffect` from React.
- Remove `initialQuery` from `SearchIslandProps` and from the component
  destructuring.
- Start query state empty: `const [query, setQuery] = useState('');`
- Add, after the existing `useHydrated` call:

```tsx
// The page is static, so the query cannot be read at build time. Read it
// after hydration: the server and first client render stay identical (idle
// state), then the shared URL fills the box and results.
useEffect(() => {
  const initial = new URLSearchParams(window.location.search).get('q') ?? '';
  if (initial) setQuery(initial);
}, []);
```

Do not write the URL in this effect; `handleChange` already does that.

**Verify**:
`grep -rn "initialQuery" src` → no matches.
`npm run typecheck` → exit 0.

### Step 3: Fold ZWNJ in search normalization only

In `src/lib/search.ts`, add:

```ts
/**
 * Search-only normalization: Persian normalization plus ZWNJ folding.
 *
 * `normalizePersian` keeps U+200C for tokenization. Search must treat
 * «زنجیره‌ای» and «زنجیرهای» as the same word, so the search layer removes it
 * from both the index and the query.
 */
export function normalizeSearchText(value: string): string {
  return normalizePersian(value).replace(/\u200C/g, '');
}
```

Use `normalizeSearchText` in all four search call sites:

- `normalizeIndexEntry` (the haystack)
- `scoreSearchItem` for `title`
- `scoreSearchItem` for each tag
- `rankSearchItems` for the query

Leave `normalizePersian` and `tokenize` untouched.

**Verify**: `npm run test` → existing score pins still pass.

### Step 4: Add ZWNJ regression tests

In `tests/unit/search.test.ts`:

- Import `normalizeSearchText`.
- Update the existing `normalizeIndexEntry` expectation to compare against
  `normalizeSearchText(...)` instead of `normalizePersian(...)` (the contract
  intentionally changed; this is not weakening a test).
- Add:

```ts
describe('ZWNJ folding', () => {
  it('matches ZWNJ and non-ZWNJ spellings in both directions', () => {
    const withZwnj = item({ id: 'z', title: 'زنجیره‌ای', excerpt: 'توضیح', tags: [] });
    const withoutZwnj = item({ id: 'p', title: 'زنجیرهای', excerpt: 'توضیح', tags: [] });
    const opts = { limit: 40, minQueryLength: 2 };
    expect(rankSearchItems([withZwnj], 'زنجیرهای', opts).map((r) => r.item.id)).toEqual(['z']);
    expect(rankSearchItems([withoutZwnj], 'زنجیره‌ای', opts).map((r) => r.item.id)).toEqual(['p']);
  });
});
```

Use the actual U+200C character in the test strings (copy the words from the
Persian text), not an escape that the editor may normalize.

**Verify**: `npm run test` → all pass, including 1 new case.

### Step 5: Prove the shared URL in a real browser

Extend the existing search block in `scripts/interaction-qa.mjs` (starts at
`/* ── Search island ── */`, around line 145). After the initial hydration
check, add:

```js
await page.goto(`${base}/search/?q=${encodeURIComponent('مشتق')}`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.dataset.searchHydrated === 'true', null, {
  timeout: 10000,
});
check('search: ?q= prefills the field', (await input.inputValue()) === 'مشتق', await input.inputValue());
await page.waitForTimeout(250);
check('search: ?q= returns results', (await page.locator('main ul li a').count()) >= 3);
check('search: shared payload is present', (await page.locator('#site-search-index').count()) === 1);
```

Run:

```bash
npm run build
npm run preview -- --port 4321   # separate terminal
node scripts/interaction-qa.mjs --base http://localhost:4321
```

**Verify**: all checks pass, including the three new ones, and no console
errors are reported by the existing checks.

## Test plan

- `tests/unit/search.test.ts`: one new ZWNJ bidirectional case; the existing
  ranking/weight pins stay unchanged.
- `scripts/interaction-qa.mjs`: `?q=` prefill and result count on the real
  built site, plus one payload-presence assertion.
- Manual red-green for the palette-off path: build with
  `commandPalette: false`, confirm the payload still exists for `/search`, then
  revert. This is the only faithful proof because the flag is compiled into
  static HTML.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run test` exits 0; the ZWNJ case exists and passes
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` exit 0
- [ ] `grep -rn "initialQuery" src` returns no matches
- [ ] `grep -c 'id="site-search-index"' dist/search/index.html` → `1`
- [ ] With `commandPalette: false` built temporarily, the payload count is
      still `1`; the config is reverted and `git diff --exit-code src/config/course.ts` passes
- [ ] `node scripts/interaction-qa.mjs` passes with the three new search checks
- [ ] `npm run ci` exits 0
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Removing `initialQuery` breaks a caller other than `search.astro` (grep
  first; the interface is public only within `src/`).
- The runtime `?q=` effect produces a hydration mismatch or console error in
  the browser. The effect runs after mount, so a mismatch means the render is
  reading the URL elsewhere; report rather than suppressing the error.
- With `commandPalette: false`, `/search` still ships no payload after the
  BaseLayout change. Do not add a second payload or a client fetch; report.
- ZWNJ folding changes the existing ranking-order pins. The fixtures contain
  no ZWNJ, so this indicates an unintended normalization change; report.
- The preview server is unavailable, so the `?q=` behavior cannot be exercised.
  Mark the plan BLOCKED with the exact missing prerequisite; do not claim URL
  behavior from code inspection alone.

## Maintenance notes

- `needsSearchIndex` is the single gate for the serialized payload. If a new
  search consumer is added, add it to that predicate; never re-serialize the
  index in a second script tag.
- `normalizeSearchText` is the search oracle; `normalizePersian` remains the
  tokenization oracle. Keep the distinction if Persian normalization changes.
- The `?q=` write in `handleChange` and the read in the mount effect are a
  pair. If one is changed, update the interaction QA case.
- Search per-keystroke normalization is still not precomputed beyond the
  haystack; a future perf pass can add `_titleNorm`/`_tagsNorm` without
  changing this contract.
