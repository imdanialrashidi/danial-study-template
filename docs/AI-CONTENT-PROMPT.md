# AI Content Prompt — canonical guide for AI-generated course content

> **Workflow rule: read this file FIRST.** Before creating, editing, reviewing,
> or validating any file under `src/content/` — or changing `src/config/course.ts`
> for a new course — read this document top to bottom. The full reference is
> `docs/CONTENT-CONTRACT.md`; this file is the entry point that tells you what
> matters and in what order. Do not invent a parallel workflow.

You are writing a Persian (RTL, `fa` locale) self-study course for the reusable
educational template in this repository. One static site per course, no backend,
no runtime services. Your output must build cleanly and read like a calm
textbook: short sentences, second person singular, formal-but-warm.

---

## 1. Start here, in this order

1. Read `src/config/course.ts` — title, sections, theme preset, feature flags.
   Every content entry's `section` must match a declared section id.
2. Read `docs/CONTENT-CONTRACT.md` — the exact contract (frontmatter tables,
   MDX components, cross-references, island rules, build-failing mistakes).
3. Skim one existing file of each type you will write under `src/content/`.
4. Prefer the generators for skeletons — they already follow the contract:
   `npm run new:lesson | new:concept | new:formula | new:question | new:example | new:glossary -- <slug>`,
   and `npm run new:course` for a whole new course.

## 2. Frontmatter rules (build fails otherwise)

- `type` must match the directory. `title` ≥ 2 chars. `description` 10–320 chars.
- `section` must exist in `course.ts` (glossary has no section).
- `order` is the position within the section; `estimatedMinutes` 1–600.
- **Quote any value containing `:`** or YAML mis-parses it.
- Filenames are slugs: lowercase kebab-case. Slugs are unique per collection.
- Type extras: lesson needs `objective`; concept needs `short`; formula needs
  `name` + `latex`; example needs `problem`; glossary needs `term` + `short`.

## 3. LaTeX — the most common silent breakage

- In MDX bodies, always use the expression container with **doubled** backslashes:
  `<Formula latex={"\\frac{dy}{dx}"} />`. Single backslashes render as literal
  text (`fracdydx`) with no error on screen — the validator catches it, so run it.
- Inline math uses `<Formula inline latex={"f'(x)"} />`. Never `\(…\)`.
- In YAML frontmatter inside **double quotes**, doubled backslashes are also
  correct (`latex: "\\frac{dy}{dx}"`) — YAML unescapes them once. Match the
  existing files; do not "fix" them to single backslashes.
- Every `<Formula>` that others link to needs a stable `id`.

## 4. Components available without imports

`Formula`, `FormulaBreakdown`, `Callout` (note/tip/warning/danger/info),
`Definition`, `Misconception`, `InteractiveFigure`, `WorkedExample`,
`Prerequisite` (with `ids`), `GlossaryTerm`, `StepReveal`, `Quiz`,
`ParamLab` (slope explorer: `<ParamLab />`), `Confused` (the "گیج شدم؟"
rescue box — use it whenever a section is genuinely hard).

Do not import React islands directly into MDX; they render but never hydrate.
If new interactivity is truly needed: component in `src/islands/course/`,
register in `src/islands/registry.ts`, wrap in `src/components/educational/`
with a `client:*` directive, add to `src/lib/mdx.ts`.

## 5. References and links

- `prerequisites`, `formulas`, `concepts`, `formula` in frontmatter must resolve
  to real entries (qualify as `<kind>/<slug>` when ambiguous). A dangling
  reference is a build error, never a guess.
- A `#fragment` must match an `id` on a `<Formula>` in the target page.
- Write clean `/lessons/...` links in prose; the build applies the deployment
  base. Never hard-code `BASE_PATH`.
- Related-content rails, breadcrumbs, prev/next, the course map, and search are
  generated from metadata — never hard-code them per page.

## 6. Quiz questions

- `multiple-choice`: `options[]` + single `correctAnswer` id (array for
  multi-select). `true-false`: two options, same mechanism.
- `numeric`: `numericAnswer` + optional `tolerance` (Persian digits accepted).
- Every question benefits from an `explanation` shown on a wrong answer.
- Scores persist in the learner's browser only. Nothing is uploaded.

## 7. Quality bar (not build-checked — do it anyway)

- One idea per lesson; state the `objective` as a capability, not a topic.
- Pair non-obvious terms with `<Definition>`, common wrong beliefs with
  `<Misconception>`, hard sections with `<Confused>`.
- Every formula gets units and validity `conditions` where applicable, plus one
  worked example per concept.
- Action labels are imperatives («بررسی پاسخ», «گام بعدی را ببینید»).
- No university, professor, department, or student-id context. The only author
  identity is Danial Rashidi (`@imdanialrashidi`); identity values live in
  `src/config/site.ts` and are never hard-coded into content.

## 8. Verify before you finish

```bash
npm run validate   # frontmatter, references, sections, LaTeX escaping
npm run test       # unit tests (quiz grading, related links, math safety)
npm run build      # static build must succeed with no warnings you introduced
```

A validation error names the file and the rule. Fix the content; do not weaken
the schema, the validator, or a test to obtain green status.
