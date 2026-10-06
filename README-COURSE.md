# Educational Site Template

A reusable, static-first educational website system for Persian (RTL) courses,
built with **Astro + TypeScript + Tailwind CSS + MDX + React Islands**.

The goal is **one strong engine → many course sites**: creating a new course
should mean editing configuration and writing content, never rebuilding the UI.

> This repository ships a small, genuine sample course (foundations of
> differential calculus) so every component and state can be seen working. It
> is sample content, not a complete course.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:4321
```

Requirements: **Node.js ≥ 22.19**.

```bash
npm run check        # validate + typecheck + test + build + budgets
```

---

## Creating a new course

> **Read [`docs/AI-CONTENT-PROMPT.md`](docs/AI-CONTENT-PROMPT.md) FIRST** —
> before creating, editing, reviewing, or validating any course content. It is
> the canonical entry point; [`docs/CONTENT-CONTRACT.md`](docs/CONTENT-CONTRACT.md)
> is the full reference it points to.

Read **[`docs/CONTENT-CONTRACT.md`](docs/CONTENT-CONTRACT.md)** first. It is the
complete, exact contract for agents and authors: configuration, content
schemas, MDX components, cross-references, island registration, and the rules
that fail the build.

In short, you change three things:

| What | Where |
|---|---|
| Course configuration | `src/config/course.ts` |
| Site identity + all external links | `src/config/site.ts` — the single source of truth (see its header) |
| Content | `src/content/<type>/*.mdx` |
| Optional course-only islands | `src/islands/course/` |

Deployment: **[`DEPLOYMENT.md`](DEPLOYMENT.md)**.

---

## What the template provides

**Content model** — six typed collections with fail-fast validation:
lessons, concepts, formulas, worked examples, practice questions, glossary
entries. Shared metadata (title, slug, order, section, difficulty, estimated
time, prerequisites, tags) plus kind-specific fields.

**Educational MDX components** — `Formula`, `FormulaBreakdown`, `WorkedExample`,
`StepReveal`, `Quiz`, `Callout`, `Definition`, `Misconception`,
`InteractiveFigure`, `Prerequisite`, `GlossaryTerm`. Available in every content
file without imports.

**Interactive islands** — a registry pattern (`src/islands/registry.ts`) so a
course can add interactions without touching core layout. Common islands
(search, quiz, reveals, progress) ship with the template.

**Static-first performance** — HTML by default; React only where interaction is
real. **Math is rendered by KaTeX at build time**, so formulas ship as static
HTML with zero client JavaScript.

**Search** — dependency-free Persian search with Arabic/Persian letter and digit
normalisation, so a learner typing with any keyboard still matches.

**Progress and bookmarks** — stored only in the learner's own browser. No
account, no server, no analytics. Degrades honestly when storage is unavailable.

**Accessible RTL Persian UI** — WCAG 2.2 AA contrast measured per token pair,
light and dark themes, keyboard operability, 44 px touch targets, reduced-motion
support.

**Deployment** — GitHub Pages and Cloudflare Pages from the same source, with
correct base-path handling for project sites.

---

## Architecture

```text
src/
  config/       course + site configuration      (course-specific)
  content/      MDX content                      (course-specific)
  content.config.ts   Zod schemas                (shared contract)
  components/
    educational/    reusable MDX components      (shared)
    layout/         chrome                       (shared)
    content/        listing cards                (shared)
    ui/             icons                        (shared)
  islands/
    common/      React islands                  (shared)
    course/      course-specific islands        (optional)
  layouts/       page shells                    (shared)
  lib/           content index, math, progress, urls
  pages/         routes
  styles/theme.css   design tokens              (shared)
scripts/         validation, budgets, browser QA
tests/unit/      unit + build-output tests
```

The engine contains no subject-specific logic: it asks "what kind of entry is
this, and where does it belong?", never "is this physics?".

---

## Documentation

| Document | Purpose |
|---|---|
| [`docs/CONTENT-CONTRACT.md`](docs/CONTENT-CONTRACT.md) | **Start here.** The content contract for authors and AI agents. |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual contract: thesis, signature element, tokens with measured contrast. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | GitHub Pages, Cloudflare Pages, base paths. |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product contract. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture decisions and invariants. |
| [`docs/QUALITY.md`](docs/QUALITY.md) | Quality bar and review rules. |

---

## Design identity

The visual direction is an **illuminated worksheet**: the calm order of a
well-kept lab notebook, with one luminous turquoise accent marking the part of
the page that carries the idea. Its signature element is the **ruled teaching
margin** and **dot-leader contents** borrowed from book typography, not app
chrome. Full rationale and tokens in [`docs/DESIGN.md`](docs/DESIGN.md).

The creator identity — **دانیال رشیدی** — is part of the product design, not a
legal footer: header, homepage creator block, and footer all carry it.

---

## Verification

```bash
npm run validate          # content: frontmatter, references, LaTeX escaping
npm run validate:links    # internal links in the built output
npm run typecheck         # astro check
npm run test              # unit + build-output tests
npm run build             # static build
npm run budgets           # performance budgets
npm run ci                # all of the above
```

Browser evidence (requires `npm run preview` in another terminal):

```bash
node scripts/visual-qa.mjs        # routes × viewports, with overflow/console checks
node scripts/interaction-qa.mjs   # quizzes, reveals, search, progress, theme, nav
node scripts/capture.mjs --url http://localhost:4321/lessons/01-intro-to-calculus \
  --w 390 --h 844 --name mobile-lesson
```

---

## License

No license has been chosen yet. The repository owner must add one before this
template is presented as reusable. Fonts are bundled under SIL OFL 1.1
(Vazirmatn, Estedad); KaTeX is MIT.