# Creating a new course from this template

This is the **content contract** for agents and authors. Everything needed to
produce a new course site without guessing repository conventions is here.

Read this file top to bottom before writing content. It is deliberately exact:
the build fails on violations, so every rule below corresponds to a real check.

---

## 1. What you are producing

One static website per course, deployed to GitHub Pages or Cloudflare Pages.

**To create a new course you normally change exactly three things:**

| What | Where | How much |
|---|---|---|
| Course configuration | `src/config/course.ts` | one file, ~40 lines |
| Content | `src/content/<type>/*.mdx` | as much as the course needs |
| Optional course-only islands | `src/islands/course/` | usually none |

You should **not** need to touch layouts, components, or styles. If you find
yourself editing those, something is probably configured wrong instead.

---

## 2. Repository conventions

```text
src/
  config/
    course.ts          ← course configuration (title, sections, theme)
    site.ts            ← creator identity + deployment (rarely changes)
  content.config.ts    ← content schemas; the source of truth for frontmatter
  content/
    lessons/           concept/       formula/       example/
    questions/         glossary/
  components/
    educational/       ← reusable MDX components (Formula, Callout, Quiz, …)
    layout/            ← Header, Footer, SectionIndex, PrevNextNav
    content/           ← EntryCard
    ui/                ← Icon
  islands/
    common/            ← React islands (Quiz, SearchIsland, StepReveal, …)
    course/            ← course-specific islands go here
    registry.ts        ← island registry
  layouts/             ← BaseLayout, CourseLayout, ContentLayout, ListingLayout
  lib/                 ← content index, math, progress, search, urls, types
  pages/               ← routes
  styles/theme.css     ← design tokens (canonical token source)
scripts/
  validate-content.mjs ← content validation
  check-budgets.mjs    ← performance budgets
docs/
  DESIGN.md            ← visual contract
```

---

## 3. Configure the course

Edit `src/config/course.ts`:

```ts
export const courseConfig: CourseConfig = {
  title: 'مبانی حساب دیفرانسیل',
  description: 'یک درس‌نامهٔ کامل دربارهٔ مشتق و کاربردهای آن.',
  locale: 'fa',
  direction: 'rtl',
  difficulty: 'beginner',
  estimatedDuration: '۸ هفته',
  tags: ['ریاضی', 'مشتق'],
  sections: [
    { id: 'foundations', title: 'مبانی', description: '…', order: 1 },
    { id: 'applications', title: 'کاربردها', description: '…', order: 2 },
  ],
  theme: { name: 'default', colors: { primary: '#0E7C7B', accent: '#9A5B00' } },
};
```

Rules:

- `sections[].id` must be lowercase kebab-case. **Every content entry's
  `section` must match one of these ids**, or the validator fails.
- `order` must be unique within a section and controls reading order.
- The core engine has **no subject-specific logic**. Nothing assumes physics,
  calculus, or any other discipline.

### Theme override

`theme.colors` rewrites only `--color-primary` and `--color-accent`. A course
can change its accent without touching the design system:

```ts
theme: { name: 'physics', colors: { primary: '#7A3E9D', accent: '#B45309' } }
```

Do not edit `src/styles/theme.css` to theme a course. It is the shared token
source; a fork would break the shared visual identity.

---

## 4. Write content

### Frontmatter (shared by all types)

| Field | Required | Type | Notes |
|---|---|---|---|
| `type` | yes | `lesson\|concept\|formula\|example\|question\|glossary` | must match the directory |
| `title` | yes | string ≥ 2 chars | **quote it if it contains `:`** |
| `description` | yes | string 10–320 | one sentence; used in cards and search |
| `section` | yes (except glossary) | kebab-case | must exist in `course.ts` |
| `difficulty` | yes | `beginner\|intermediate\|advanced` | |
| `order` | yes | integer | position within the section |
| `estimatedMinutes` | yes | integer 1–600 | rendered as «۴۵ دقیقه» |
| `tags` | no | string[] ≤ 12 | shown on cards |
| `prerequisites` | no | slug[] ≤ 8 | must resolve to real entries |
| `draft` | no | boolean | `true` hides the entry from the site |

**Quote any value containing `:`** — YAML would otherwise mis-parse it:

```yaml
description: "نکته‌ای دربارهٔ حد: چرا لازم است؟"   # ✅
description: نکته‌ای دربارهٔ حد: چرا لازم است؟    # ❌ build error
```

### Type-specific fields

| Type | Extra required | Extra optional |
|---|---|---|
| `lesson` | `objective` (what the learner can do after) | `formulas[]`, `concepts[]` |
| `concept` | `short` (one-line definition) | `formulas[]` |
| `formula` | `name`, `latex` | `units`, `conditions[]` |
| `example` | `problem` | `formula` |
| `question` | — | `points`, `instructions` |
| `glossary` | `term`, `short` | `group` |

### Slugs

The **filename is the slug**: `src/content/lessons/limits-and-continuity.mdx` → `/lessons/limits-and-continuity`.

Slugs must be lowercase kebab-case. They are unique **per collection**, so a
glossary term may share a name with a concept — their URLs still differ. To
reference them unambiguously, qualify the reference: `concept/derivative`.

---

## 5. LaTeX in MDX — read this carefully

**This is the single most common way to break the build or the output.**

Math is rendered by KaTeX **at build time**, so formulas ship as static HTML
with zero client JavaScript. The trade-off is that MDX processes escape
sequences twice.

### The rule

Always pass LaTeX through the MDX **expression container**:

```mdx
✅ <Formula latex={"\\frac{dy}{dx} = \\frac{dy}{du}\\cdot\\frac{du}{dx}"} caption="قاعدهٔ زنجیره‌ای" />

❌ <Formula latex="\frac{dy}{dx} = \frac{dy}{du}\cdot\frac{du}{dx}" />
   → renders the literal text "fracdydx = fracdydu…" with no layout
```

In the `.mdx` file you type `\\frac` (two backslashes). JavaScript then reduces
that to `\frac`, which is what KaTeX receives.

`scripts/validate-content.mjs` and the build both reject the broken form with a
message naming the exact command that lost its backslash, so you cannot ship
it silently.

### Inline math

Use the `inline` prop. Never use `\(…\)` delimiters — MDX parses them
inconsistently.

```mdx
مشتق تابع <Formula inline latex={"f'(x)"} /> در نقطهٔ <Formula inline latex={"x"} /> برابر است با …
```

`latex` values without a backslash command are treated as plain text, so
`latex={"سرعت"}` is safe.

### Frontmatter `latex` is different

Inside YAML, **single backslashes are correct** — YAML does not process escapes:

```yaml
latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}"   # ✅ in YAML
```

---

## 6. MDX components available in every content file

These names always work without an import:

| Component | Purpose | Key props |
|---|---|---|
| `<Formula>` | typeset math | `latex`, `caption`, `id`, `inline`, `showSource` |
| `<FormulaBreakdown>` | explain each symbol | `terms: [{term, label, detail}]` |
| `<Callout>` | note / tip / warning / danger / info | `type`, `title` |
| `<Definition>` | textbook-style term + meaning | `term`, `id`, `alt` |
| `<Misconception>` | wrong belief vs. correction | `wrong`, `correct` |
| `<InteractiveFigure>` | inline SVG diagram | `viewBox`, `caption`, `alt` |
| `<WorkedExample>` | problem + step-by-step reveal | `title`, `problem`, `steps[]`, `difficulty` |
| `<Prerequisite>` | link to earlier material | `ids: []` |
| `<GlossaryTerm>` | expandable term | `id`, `href` |
| `<StepReveal>` | reveal steps on demand | `steps[]`, `mode` |
| `<Quiz>` | graded practice | `id`, `title`, `questions[]` |

### WorkedExample

```mdx
<WorkedExample
  title="مشتق یک تابع مرکب"
  problem="مشتق y = sin(3x²) را پیدا کنید."
  difficulty="intermediate"
  steps={[
    { title: 'گام ۱', content: 'تابع را لایه‌لایه باز کنید.' },
    { title: 'گام ۲', content: 'متغیر موقت بگذارید.', latex={"u = 3x^2"} },
  ]}
/>
```

Each step takes `title`, `content`, and `latex`. Steps render one at a time so
a learner can try before seeing the answer.

### Quiz

```mdx
<Quiz
  id="quiz-derivative-1"
  title="سنجش فهم"
  questions={[
    {
      id: 'q1',
      type: 'multiple-choice',
      text: 'مشتق چه چیزی را توصیف می‌کند؟',
      options: [
        { id: 'a', text: 'شیب لحظه‌ای' },
        { id: 'b', text: 'مساحت زیر نمودار' },
      ],
      correctAnswer: 'a',
      explanation: 'مشderiv بیان می‌کند تابع چقدر سریع تغییر می‌کند.',
    },
  ]}
/>
```

- `correctAnswer` is a single option id, or an array for multi-select.
- `type: 'true-false'` is conventional for two options; grading uses
  `correctAnswer`, so it still works if you omit `type`.
- `explanation` is shown when an answer is wrong.
- Scores persist in the learner's own browser. Nothing is uploaded anywhere.

---

## 7. Cross-referencing content

Reference entries from frontmatter; the build fails if a target is missing.

```yaml
prerequisites: [limit]          # same collection first, then unique match
formulas: [chain-rule]         # lesson / concept → formula
concepts: [derivative]
formula: chain-rule             # example → formula
```

For a specific section of a page:

```yaml
formulas: [chain-rule#chain-rule]
```

The fragment must match an `id` attribute on a `<Formula>` in the target page.
If it does not, the build fails with the exact fragment name.

---

## 8. Add an interactive island

The core layout never imports an island directly. To add one:

1. Create `src/islands/course/<Name>.tsx` — a React component.
2. Register it in `src/islands/registry.ts`.
3. Create a thin Astro wrapper in `src/components/educational/` that carries the
   `client:*` directive, and add it to `src/lib/mdx.ts`.

**Step 3 is not optional.** MDX renders a bare React component to static HTML
that never responds to clicks; only an Astro wrapper with `client:load` (or
`client:visible` / `client:idle`) hydrates it. See `Quiz.astro` and
`StepReveal.astro` for the pattern.

Choosing a directive:

| Directive | Use when |
|---|---|
| `client:load` | needed immediately (search, quiz) |
| `client:visible` | near the end of a long page (completion mark) |
| `client:idle` | secondary action, can wait (bookmark) |

Rules for a good island:

- Ship the **content** in the static HTML; the island adds behaviour only.
- If it must show a loading state, the static HTML should already show the
  settled state so no-JS users see something meaningful.
- Prefer no new dependency. Justify any library in one sentence.
- Set `data-hydrated` (via the `useHydrated` hook in
  `src/islands/common/useHydrated.ts`) so the browser check can prove the island
  actually hydrated.

---

## 9. Verify your course

```bash
npm run validate        # frontmatter, references, sections, LaTeX escaping
npm run test            # unit tests
npm run build           # static build
npm run budgets         # performance budgets
npm run check           # all of the above
npm run validate:links  # internal links in the built output
```

For the browser evidence used before shipping a course:

```bash
npm run build && npm run preview          # serve dist/
node scripts/visual-qa.mjs                # every route × every viewport
node scripts/interaction-qa.mjs           # quizzes, reveals, search, progress
```

`visual-qa.mjs` fails on page-level horizontal overflow, console errors, failed
requests, missing `<h1>`, wrong `dir`, and unrendered TeX. It checks the viewports
the product targets: 360, 390, 430, 768, 1024, 1360.

---

## 10. Deploy

See [`DEPLOYMENT.md`](DEPLOYMENT.md). In short: set `BASE_PATH` and `SITE_URL`;
never hard-code a provider.

---

## 11. Rules that will fail the build

| Mistake | Result |
|---|---|
| `latex="\frac{...}"` in MDX | raw text; caught by validator |
| unquoted frontmatter value containing `:` | YAML parse error |
| `section` not declared in `course.ts` | validator error |
| `prerequisites` pointing at a missing entry | build error |
| `#fragment` that does not exist in the target | build error |
| a React component used directly in MDX | renders but never hydrates |
| editing `theme.css` to theme one course | design drift; use `theme.colors` |
| `<a href="/...">` written by hand | missing base prefix; use `withBase()` |

---

## 12. Content quality bar

The build will not check these, but a course should meet them:

- Write in clear Persian. Short sentences. Second person.
- One idea per lesson; give the learner a reason to continue.
- State the **objective** of every lesson as a capability, not a topic.
- Pair every non-obvious term with `<Definition>` and every common wrong belief
  with `<Misconception>`.
- Show units and validity conditions for every formula.
- Give at least one worked example per concept.
- Write labels as imperatives: «گام بعدی را ببینید», not «برای مشاهده کلیک کنید».
- No university, professor, department, or student-id context. The only author
  identity is Danial Rashidi.