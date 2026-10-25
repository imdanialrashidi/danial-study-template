# Plan 028: Move course-specific page copy out of shared routes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- src/lib/types.ts src/config/course.ts src/lib/courseCopy.ts src/pages/lessons/index.astro src/pages/concepts/index.astro src/pages/formulas/index.astro src/pages/examples/index.astro src/pages/practice/index.astro src/pages/glossary/index.astro src/pages/map.astro src/pages/about.astro`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (copy-only; built descriptions must remain byte-identical)
- **Depends on**: none
- **Category**: tech-debt + correctness
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

The product’s MVP outcome is: “a new course site is produced by changing
`src/config/course.ts` plus adding content — no UI or architecture work.”
`docs/QUALITY.md` invariant #4 says the engine has no subject coupling.

But eight shared routes hard-code calculus copy in their `description` props.
A physics, programming, or statistics course changes `course.ts` and still
ships the following visible/meta text:

- «درس‌های حساب دیفرانسیل…»
- «مفاهیم پایهٔ حساب دیفرانسیل…»
- «فرمول‌های مشتق…»
- «مثال‌های حل‌شدهٔ مشتق…»
- «تمرین‌های حساب دیفرانسیل…»
- «واژه‌نامهٔ حساب دیفرانسیل…»
- «نقشهٔ کامل دورهٔ حساب دیفرانسیل…»
- «دربارهٔ درس‌نامهٔ آزاد حساب دیفرانسیل…»

This is the exact failure the template exists to prevent. Move the strings to
course configuration, keep a generic fallback, and leave the sample’s rendered
output unchanged.

## Current state

The shared pages pass literal descriptions:

| File | Line | Current literal |
|---|---|---|
| `src/pages/lessons/index.astro` | 10 | `درس‌های حساب دیفرانسیل به‌ترتیب وابستگی: …` |
| `src/pages/concepts/index.astro` | 10 | `مفاهیم پایهٔ حساب دیفرانسیل — حد، مشتق و نرخ تغییر …` |
| `src/pages/formulas/index.astro` | 10 | `فرمول‌های مشتق با معنی هر نماد …` |
| `src/pages/examples/index.astro` | 10 | `مثال‌های حل‌شدهٔ مشتق، گام‌به‌گام …` |
| `src/pages/practice/index.astro` | 10 | `تمرین‌های حساب دیفرانسیل برای سنجش فهم حد و مشتق …` |
| `src/pages/glossary/index.astro` | 48 | `واژه‌نامهٔ حساب دیفرانسیل: تعریف کوتاه و دقیق …` |
| `src/pages/map.astro` | 41 | `نقشهٔ کامل دورهٔ حساب دیفرانسیل: همهٔ بخش‌ها …` |
| `src/pages/about.astro` | 26 | `دربارهٔ درس‌نامهٔ آزاد حساب دیفرانسیل دانیال رشیدی …` |

`src/config/course.ts:16–21` already holds `title`, `tagline`, `description`,
and `shortDescription`, but these pages do not use them. `CourseConfig` in
`src/lib/types.ts:130–160` has no per-page copy field.

Site identity is single-sourced in `src/config/site.ts` (`creator.name`).
Shared components import it; these descriptions bypass it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Unit | `npm run test` | all pass |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Full gate | `npm run ci` | exit 0 |

## Scope

**In scope** (the only files you should modify/create):
- `src/lib/types.ts` (add `PageCopyKey` and the optional `pageCopy` field)
- `src/config/course.ts` (add the sample `pageCopy` block)
- `src/lib/courseCopy.ts` (create the resolver + generic fallbacks)
- `src/pages/lessons/index.astro`
- `src/pages/concepts/index.astro`
- `src/pages/formulas/index.astro`
- `src/pages/examples/index.astro`
- `src/pages/practice/index.astro`
- `src/pages/glossary/index.astro`
- `src/pages/map.astro`
- `src/pages/about.astro`

**Out of scope** (do NOT touch):
- Any content file under `src/content/**` — the sample lessons may mention
  calculus; that is course content, not shared UI.
- `src/pages/index.astro` (homepage) — it already derives from
  `courseConfig`, **but its hero illustration/caption is a calculus derivative
  plate**. That is a separate design decision (plan 012’s motif work); do not
  fold a hero redesign into this copy-only plan.
- `src/pages/search.astro`, `src/pages/saved.astro`, `404.astro` — already
  subject-neutral.
- Layouts, components, styles, JSON-LD shape, titles, or URLs.
- `docs/PRODUCT.md` / `docs/QUALITY.md` — invariants already state the rule.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`.

## Steps

### Step 1: Record the current built descriptions

Run `npm run build`, then capture the eight current `<meta name="description">`
values so Step 5 can prove the copy is unchanged:

```bash
for p in lessons concepts formulas examples practice glossary map about; do
  printf '%s: ' "$p"
  grep -o '<meta name="description" content="[^"]*"' "dist/$p/index.html"
done
```

Save the output outside the repository (or in the execution log). Do not edit
`dist/`.

### Step 2: Add the page-copy contract

In `src/lib/types.ts`, add near the course configuration types:

```ts
/** Shared engine pages whose copy may be overridden per course. */
export type PageCopyKey =
  | 'lessons'
  | 'concepts'
  | 'formulas'
  | 'examples'
  | 'practice'
  | 'glossary'
  | 'map'
  | 'about';
```

Add to `CourseConfig`:

```ts
  /**
   * Optional per-page meta descriptions for the shared listing/reference
   * routes. Omitted keys fall back to copy derived from `title`/`description`.
   * Course-specific prose belongs here, never in a shared page component.
   */
  pageCopy?: Partial<Record<PageCopyKey, string>>;
```

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Create the resolver with generic fallbacks

Create `src/lib/courseCopy.ts`:

```ts
import { courseConfig } from '../config/course';
import { creator } from '../config/site';
import type { PageCopyKey } from './types';

/**
 * Meta descriptions for shared engine routes.
 *
 * A course may override any key in `src/config/course.ts` → `pageCopy`.
 * The fallback derives from course config + creator identity, so a new course
 * never inherits another subject's copy.
 */
const fallback: Record<PageCopyKey, string> = {
  lessons: `درس‌های ${courseConfig.title}: ${courseConfig.description}`,
  concepts: `مفاهیم ${courseConfig.title}: ${courseConfig.description}`,
  formulas: `فرمول‌های ${courseConfig.title}: معنی نمادها، شرایط اعتبار و کاربرد.`,
  examples: `مثال‌های حل‌شدهٔ ${courseConfig.title}: گام‌به‌گام، از صورت مسئله تا پاسخ.`,
  practice: `تمرین‌های ${courseConfig.title}: فهم خود را بسنجید و پاسخ‌ها را در همین مرورگر نگه دارید.`,
  glossary: `واژه‌نامهٔ ${courseConfig.title}: تعریف کوتاه و دقیق اصطلاح‌های دوره.`,
  map: `نقشهٔ کامل ${courseConfig.title}: همهٔ بخش‌ها و مطالب به‌ترتیب خواندن.`,
  about: `دربارهٔ ${courseConfig.title} از ${creator.name}: روش مطالعه، ساختار بخش‌ها و راه ارتباط.`,
};

export function pageDescription(key: PageCopyKey): string {
  const override = courseConfig.pageCopy?.[key]?.trim();
  return override && override.length > 0 ? override : fallback[key];
}
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Move the sample copy into `course.ts`

Add a `pageCopy` block to `src/config/course.ts` with the **exact current
strings** from the table in “Current state” (preserve punctuation and
half-spaces). Place it after `features` or after `theme`, with a short comment:

```ts
  // --- Shared-page meta descriptions ---
  // Course-specific copy for the engine's listing/reference routes. Omit a
  // key to use the generic fallback in src/lib/courseCopy.ts.
  pageCopy: {
    lessons: '…',
    concepts: '…',
    formulas: '…',
    examples: '…',
    practice: '…',
    glossary: '…',
    map: '…',
    about: '…',
  },
```

Then update each page:

- `src/pages/lessons/index.astro`: import
  `{ pageDescription } from '../../lib/courseCopy';` and set
  `description={pageDescription('lessons')}`.
- `concepts` / `formulas` / `examples` / `practice`: same, with their key.
- `src/pages/glossary/index.astro`: same, key `'glossary'`.
- `src/pages/map.astro`: same, key `'map'`.
- `src/pages/about.astro`: same, key `'about'`.

Keep titles, JSON-LD, headings, and body prose unchanged. Do not add the copy
to `ListingLayout` as a default — each page owns its key.

**Verify**:
`grep -rn "حساب دیفرانسیل\|مشتق" src/pages/lessons/index.astro src/pages/concepts/index.astro src/pages/formulas/index.astro src/pages/examples/index.astro src/pages/practice/index.astro src/pages/glossary/index.astro src/pages/map.astro src/pages/about.astro`
→ no matches.
`npm run build` → exit 0.
Re-run the Step 1 capture; every one of the eight descriptions must be
**identical** to the pre-change capture. If any description changed, the copy
was transcribed incorrectly; fix it before proceeding.

### Step 5: Run the gate and check the fallback path

Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run ci`.
Then prove the fallback is not sample-specific:

- Temporarily remove the `lessons` key from `pageCopy` in
  `src/config/course.ts`, run `npm run build`, and confirm
  `dist/lessons/index.html` still has a non-empty description containing
  `courseConfig.title`.
- Restore the key exactly; `git diff` must show only the intended edits.

**Verify**: the temporary build contains the course title in the lessons
description, and the restored file builds green.

## Test plan

No new test file is warranted: this is a copy-only refactor whose contract is
proved by the built output. The verification is:

1. pre/post `<meta name="description">` equality for all eight routes;
2. `grep -rn "حساب دیفرانسیل\|مشتق" src/pages` returns nothing;
3. one temporary fallback build with the `lessons` key removed.

If a future change adds a new shared page, add its key to `PageCopyKey` and
the fallback map; a unit test is unnecessary unless the resolver gains logic
beyond “override or fallback”.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "حساب دیفرانسیل\|مشتق"` over the eight in-scope page files
      returns no matches (the homepage hero illustration is explicitly out of
      scope; see Maintenance notes)
- [ ] `npm run build` exits 0; the eight `<meta name="description">` values
      are identical to the pre-change capture
- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run ci` exit 0
- [ ] `grep -n "pageCopy" src/config/course.ts src/lib/types.ts` shows the
      config block and the type field
- [ ] The temporary fallback build (Step 5) produced a lessons description
      containing `courseConfig.title`, and the key was restored
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The pre/post meta descriptions differ for any of the eight routes. Do not
  “improve” the copy while moving it; this plan is a refactor.
- `src/config/site.ts` cannot be imported from `src/lib/courseCopy.ts` without
  a cycle or a build error. In that case, omit the `creator.name` fallback and
  report rather than duplicating identity strings.
- A page’s description is used somewhere other than `<meta name="description">`
  (for example JSON-LD) and the change would alter structured data; report the
  second sink instead of changing it silently.
- The copy contains characters that Astro escapes differently in HTML; compare
  the rendered meta content, not the source string, and report a mismatch.

## Maintenance notes

- New shared pages must add a `PageCopyKey`, a fallback entry, and a
  `pageDescription(key)` call. Course-specific prose never returns to
  `src/pages/**`.
- `courseConfig.pageCopy` is course data, so `npm run new:course` does not
  need to write it; the fallback is already subject-neutral.
- The pre/post description comparison is the regression check for future copy
  moves. Keep the copy in one place: `course.ts` or the fallback, never both
  with different text.
