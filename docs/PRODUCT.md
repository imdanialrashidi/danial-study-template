# Product Contract

The durable source of truth for what this product must do. Implemented by the
educational website template; see `README-COURSE.md` for usage.

## Users and problem

- **Primary users:** Persian-speaking learners working through one self-study
  course, on a phone more often than a laptop, often revisiting a single formula
  or definition rather than reading linearly.
- **Context:** RTL Persian, `fa` locale, light and dark, 360–1360 px, touch and
  keyboard, 200 % zoom.
- **Problem:** free educational material is scattered, inconsistent, and often
  either a bare PDF or a bloated web app. Learners lack a calm place to read,
  search, practise, and track progress.
- **Current alternative:** YouTube playlists, scattered PDFs, LMS platforms.
- **Why now:** the same reader (one learner) needs the same reading experience
  across many subjects. The engine should be built once.

## MVP outcome

- **Measurable outcome:** a new course site is produced by changing
  `src/config/course.ts` plus adding content — no UI or architecture work.
- **Riskiest product assumption:** that AI-generated content can be produced
  reliably against a typed content contract without producing broken pages.
- **Smallest experiment:** generate a sample course from `docs/CONTENT-CONTRACT.md`
  alone and measure how many validation errors a competent agent produces.
- **Hard constraints:** static-only output, no backend, no runtime external
  service, self-hosted assets, Persian RTL.
- **Supported platforms:** any static host; GitHub Pages and Cloudflare Pages
  verified.

## Must-have user flows

1. Browse the course from the homepage contents and navigate by section.
2. Read a lesson containing formulas, definitions, callouts, worked examples
   and misconceptions, on a 360 px phone, with no horizontal overflow.
3. Look up a formula or term by search and jump straight to it.
4. Attempt a practice quiz, get graded feedback with explanations, and retry.
5. Mark a page finished or bookmark it, and see course progress persist across
   reloads on the same device.

## Non-goals

- User accounts, authentication, or cross-device sync.
- Server-side search, comments, forums, or any backend.
- Course authoring inside the browser (content is versioned in the repo).
- Analytics or telemetry.
- Content generation at build time.

## Acceptance criteria

- [x] A polished reusable template exists using Astro + TypeScript + Tailwind +
      MDX + React Islands.
- [x] The core UI is independent of any university, professor, or institution.
- [x] Creator identity is consistently represented as Danial Rashidi with
      `imdanialrashidi.github.io` and `t.me/imdanialrashidi`.
- [x] A new course can be created by changing configuration and content.
- [x] Content is schema-validated and MDX composes reusable components.
- [x] The site is static-first and deployable to GitHub Pages / Cloudflare Pages.
- [x] The template is mobile-first and verified at 360/390/430/768/1024/1360.
- [x] The repository documents how to create future course sites.

## Security, privacy, and compliance

- **Data classification:** none. The site stores no personal data and collects
  no telemetry. Learner progress is local to the browser.
- **Critical access rules:** there are no accounts or privileged operations.
- **External/payment providers:** none.
- **Retention/deletion:** local progress is cleared by clearing site data;
  `clear()` exists on the progress store.

**Trust boundaries.** Course content (author- or AI-generated) is untrusted
input. It is validated by Zod schemas, rendered with KaTeX in `trust: false`
mode (no `\href`, `\url`, or `\includegraphics` expansion), and plain text passed
through the math helper is HTML-escaped. `tests/unit/math.test.ts` pins this.

## Performance and UX budgets

- **Core page target:** static HTML; LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1
  (Core Web Vitals, p75) once field data exists.
- **Lab budget:** first-party JS ≤ 120 KB gzip, CSS ≤ 90 KB gzip, any single
  page ≤ 200 KB HTML, zero KaTeX runtime. Enforced by
  `scripts/check-budgets.mjs`. Measured: 56 KB JS, 15 KB CSS.
- **Supported device baseline:** evergreen browsers; touch and keyboard.
- **Accessibility target:** WCAG 2.2 AA. Every semantic colour pair has a
  measured contrast ratio recorded in `docs/DESIGN.md`.
- **Brand character:** annotated, not decorated; warm and papery, not clinical;
  rigorous, not forbidding.
- **Visual ambition:** flagship — this is the shared identity for every course.
- **Locales/directions:** Persian `fa`, RTL. Components use logical CSS
  properties so they stay direction-agnostic.
- **Visual contract:** `docs/DESIGN.md`.

## Measurement and operations

- **Activation event:** a learner marks a page finished or completes a quiz.
- **Guardrail metrics:** JS budget; no console errors; no page-level horizontal
  overflow; content validation passes.
- **Required telemetry:** none, by design.
- **Support/recovery:** learners can report problems via the Telegram link in
  the footer; a broken course is fixed by editing content and redeploying.

## Open product decisions

- Whether per-course visual motifs (beyond the accent override) are worth the
  maintenance cost. Deferred until a real course asks for one.
- Whether to surface a "bookmarked" listing page; the store already records
  bookmarks but no page reads them yet.