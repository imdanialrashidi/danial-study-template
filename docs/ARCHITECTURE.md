# Architecture Decisions

Durable constraints for the educational site template. Record decisions here,
not a diary of changes.

## Current system

- **Runtime/platform:** Node.js ≥ 22.19, static build, browser runtime.
- **Main modules:**
  - `src/config/` — course and site configuration (the only course-specific code).
  - `src/content.config.ts` — Zod schemas; the content contract.
  - `src/content/` — MDX content.
  - `src/components/` — static Astro components (layout chrome + educational).
  - `src/islands/` — React islands, split into `common/` and `course/`.
  - `src/lib/` — content index, build-time math, progress store, search, URLs.
  - `src/layouts/`, `src/pages/` — page shells and routes.
  - `src/styles/theme.css` — canonical design tokens.
  - `scripts/` — validation, budgets, browser QA.
- **Data stores:** none on the server. Learner progress lives in `localStorage`
  under `dr-study-progress:v1`.
- **External services:** none at runtime. Fonts and KaTeX CSS are bundled.
- **Deployment topology:** static `dist/` served by GitHub Pages or Cloudflare
  Pages. Base path is supplied via `BASE_PATH`.

## Trust boundaries and critical data flows

1. **Course content → build.** Author- or AI-authored MDX is untrusted input.
   Zod schemas reject malformed frontmatter; KaTeX runs with `trust: false`;
   `assertTeXIntact` rejects TeX whose backslashes were stripped; the
   validator cross-checks every reference and fragment target.
2. **Content → DOM.** Static rendering only. `<Content components={…} />`
   injects the shared MDX component map; nothing else is injected.
3. **Browser → localStorage.** Progress and theme preferences only. No
   identifiers, no network writes. Storage failure degrades to in-memory state
   and is reported honestly in the UI.
4. **Browser → network.** Static assets only. No analytics, no API calls.

## Non-negotiable invariants

- **Static-first.** No page may require JavaScript to be readable. Interactive
  islands add behaviour, never content.
- **No subject coupling.** The engine never asks what discipline it is hosting.
- **Globally unique content identity.** Every entry has `qualifiedId`
  (`<kind>/<slug>`), because slugs are only unique within a collection.
- **Internal links go through `withBase()`.** Astro does not rewrite hand-written
  `href` attributes, so a project-site deployment silently breaks otherwise.
- **One `<h1>` per page; `dir="rtl"` and `lang="fa"` on every page.**
- **Colour is never the only carrier of meaning.**
- **Math is pre-rendered.** No KaTeX JavaScript may be emitted.

## Chosen patterns

| Area | Decision | Why | Revisit when |
|---|---|---|---|
| Framework | Astro with islands | static HTML by default; React only where interaction is real | never for this product |
| Styling | Tailwind + CSS custom properties | one token source, no second framework | never |
| Content | Content Layer (`glob` loader) + Zod | fail-fast on malformed content; one contract for authors and agents | if a non-file source is needed |
| Math | KaTeX at build time | beautiful math with zero client JS | if interactive typesetting is genuinely needed |
| Islands | Registry + Astro wrappers | a course can add interactivity without touching core layout | never |
| Search | Hand-written normalised scoring | avoids a dependency; Persian-aware normalisation is the real requirement | if the index exceeds a few thousand entries |
| Progress | `localStorage` via a typed store | no backend; degrades honestly when unavailable | if cross-device sync is ever required |
| Theming | CSS variables + two role overrides | a course changes accent colour, not the design system | never |

## Explicitly rejected complexity

- **Search library (Fuse.js/Orama)** — a few hundred entries do not justify a
  dependency; the normalisation problem is Persian-specific and better handled
  directly.
- **Client-side math (MathJax/KaTeX runtime)** — contradicts the static-first
  budget for a benefit no course has asked for.
- **A headless CMS** — content belongs in version control so it is reviewable
  and diffable.
- **User accounts** — out of scope for a static template.
- **Per-course design systems** — a second palette would break the shared visual
  identity that justifies the shared engine.
- **A token framework (Style Dictionary, vanilla-extract)** — CSS custom
  properties already cover this at the required scale.

## Operational baseline

- **Configuration/secrets:** none. `BASE_PATH` and `SITE_URL` are the only
  build inputs; both are non-secret.
- **Migrations:** not applicable.
- **Backup and tested restore:** version control provides restore for content
  and configuration.
- **Logging/monitoring:** CI fails on content validation, type errors, test
  failures, budget violations, and browser-QA findings. No runtime monitoring.
- **Rollback:** revert and redeploy. Content changes are additive and reviewed.

## Verification gates

| Gate | Command | Catches |
|---|---|---|
| Content | `npm run validate` | bad frontmatter, dangling references, LaTeX escaping trap |
| Types | `npm run typecheck` | unsafe casts, API drift |
| Unit | `npm run test` | pure logic and built-output contract (RTL, single `h1`, creator identity, no institutional branding, link resolution) |
| Build | `npm run build` | anything that breaks static rendering |
| Budgets | `npm run budgets` | JS/CSS/HTML budgets; KaTeX runtime leaking in |
| Browser | `node scripts/visual-qa.mjs` | overflow, console errors, failed requests, hydration |
| Interaction | `node scripts/interaction-qa.mjs` | quiz grading, reveals, search, persistence, theme, mobile nav |