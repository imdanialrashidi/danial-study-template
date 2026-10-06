# Product Design Contract

The visual and interaction source of truth for every `study.danialrashidi.ir` course.
Code tokens own resolved values (`src/styles/theme.css`); this file owns intent and role mapping.

## Owner direction

Captured from the founder's brief. Owner-stated choices are marked **[owner]**;
everything else is **[proposed]** and may be revised without owner sign-off.

- **Owner-stated style / design system:** personal, creator-led educational product. Must feel like a
  premium educational publication, not a starter template, SaaS dashboard, or institutional course page.
  Explicitly rejected: university/professor/faculty/student-ID branding, fake course staff, glassmorphism,
  noisy gradients, oversized meaningless cards, template-like AI aesthetics.
- **Header brand [owner, 2026-10-06]:** no monogram, no creator name as the logo. The header mark is
  a book SVG; the wordmark is the course title (with «درس‌نامهٔ آزاد» as the quiet second line).
  Creator identity stays in the footer, homepage creator block, and about page — not in the header lockup.
- **Exact brand colors and intended roles:** none supplied. Palette below is **[proposed]** and derived
  from the product's own world (Persian scientific manuscripts and illuminated geometry), not from a
  trend reference. A course may override only `--color-primary` / `--color-accent` via course config.
- **Theme(s), typography, density, shape, motion, RTL/locales:** Persian `fa`, RTL, mobile-first,
  measured at 360 / 390 / 430 / 768 / 1024 / 1360 px. Light and dark both required.
- **Must keep / avoid:** keep creator identity prominent (not a legal footer), keep math beautiful,
  keep motion restrained. Avoid dashboard grids, pill overload, scroll reveals, decorative numbering
  that implies meaning.
- **Agent-proposed details / unresolved choices:** the "illuminated worksheet" thesis, dot-leader
  contents, ruled teaching margin, and the exact hex values are **[proposed]**.
- **Owner direction for the homepage refinement slice (2026-10-06) [owner]:** preserve the
  existing illuminated-worksheet identity and palette; no new visual system. Homepage hero must
  state what the course is, what the learner gets, and one dominant primary action (secondary
  actions visually quieter). Header brand must be fixed through typography/spacing/alignment,
  not a larger logo. Creator socials are GitHub `@imdanialrashidi` and Instagram
  `@imdanialrashidi`, presented as creator identity (not decorative badges); Telegram identity
  invites learners to discover new subjects, study websites, and updates via a tasteful,
  non-intrusive, dismissible popup. Course numbers use only real metadata and must read less
  dashboard-like. A lightweight responsive roadmap must answer «از کجا شروع کنم و بعدش کجا برم؟»
  from existing content data (no second hard-coded structure). All usernames, URLs, and identity
  values live in one typed central config. Mobile-first 360–1360 px with no page-level overflow.
- **Agent-proposed details for this slice [proposed]:** hero keeps the catalogue record but as a
  quiet bibliographic strip beside a thin-stroke geometric course plate; roadmap is a vertical
  start-edge timeline reusing `getSectionGroups()`; popup triggers on post-engagement
  (delay + scroll depth, once per 30 days via localStorage, Esc/backdrop dismiss, focus return,
  reduced-motion safe); stats derive section/entry/minute counts from `getAllEntries()`.
- **Canonical code token source:** `src/styles/theme.css` (CSS custom properties on `:root` and
  `[data-theme='dark']`), exposed to Tailwind in `tailwind.config.cjs`.

## Experience brief

- **Product / surface:** the reusable shell for a full course website — front matter, section index,
  lessons, concepts, formulas, worked examples, practice, glossary, search.
- **Primary audience:** a Persian-speaking learner working through one course on phone or laptop,
  often revisiting a single formula or definition.
- **Single job of this surface:** make one idea understandable and let the learner keep moving.
- **Desired user feeling before → after:** a dense, slightly intimidating syllabus → a calm desk where
  the next step is obvious and past progress is visible.
- **Success signal:** a learner can find a formula by search, read its explanation, and mark it done
  on a 360 px phone without a horizontal scroll.

## Brand character

- **Annotated, not decorated** — every rule, numeral and rule-mark earns its place as a guide.
- **Warm and papery, not clinical** — ink on paper, not white on a dark SaaS canvas.
- **Rigorous, not forbidding** — the textbook voice in Persian, calm and precise.

## Reference calibration

| Reference / local image | Owner preference | Adopt / avoid and reason | Inspection status |
|---|---|---|---|
| Owner brief text (task description) | unspecified | Adopt: premium educational tone, mobile-first, RTL. Avoid: SaaS/dashboard and glassmorphism anti-patterns it names. | inspected (text only) |
| Persian illuminated manuscript / geometric tilework tradition | unspecified | Adopt: single luminous accent + hairline geometry; Persian numerals as UI numerals. Avoid: literal ornament, pseudo-Islamic clip-art. | not inspected (no image supplied) |

No reference images were supplied, so nothing is recorded as owner-approved visually.

## Direction

- **Visual thesis:** *illuminated worksheet* — the calm order of a well-kept lab notebook, with one
  luminous turquoise accent marking the part of the page that carries the idea (a formula, a definition,
  the current section).
- **Signature element:** the **ruled teaching margin** — a hairline rail on the RTL start edge of the
  reading column carrying Persian-numeral section markers (بخش ۰۱ …). On mobile it collapses into a
  compact ۲-px start-edge bar per section rather than disappearing, so the reading rhythm survives at
  360 px. Paired with **dot-leader contents** (`عنوان ······ شماره`) borrowed from book typography.
- **Aesthetic risk:** deliberately bookish rather than "app-like" — warm paper canvas, serif-ish display
  face, dot leaders, and marginal numerals in an era of dark-mode SaaS dashboards.
- **What must feel familiar:** the rhythm of a good textbook spread: term → definition → formula →
  worked example → check yourself.
- **What must never look generic:** no icon-soup feature grid, no gradient hero, no stat-card trio.

## Semantic tokens

Code source: `src/styles/theme.css`. Contrast measured with the WCAG 2.2 relative-luminance formula.

### Color

| Role / state | Theme | Exact value | Foreground/background pair | Contrast proof |
|---|---|---|---|---|
| canvas | light | `#FAF7F0` | — | — |
| surface | light | `#FFFFFF` | — | — |
| surface-sunken | light | `#F1EDE4` | — | — |
| text | light | `#221E1A` | on canvas `#FAF7F0` | **15.47:1** PASS |
| muted text | light | `#6B6257` | on canvas / surface / sunken | **5.59 / 5.98 / 5.12** PASS |
| action | light | `#0E7C7B` | `#FFFFFF` on it | **5.01:1** PASS |
| action-deep (hover) | light | `#0A5C5B` | `#FFFFFF` on it | **7.79:1** PASS |
| accent (formula, current marker) | light | `#9A5B00` | on canvas `#FAF7F0` | **5.07:1** PASS |
| border (hairline) | light | `#E4DCCD` | decorative divider only | n/a (not a control) |
| border-control | light | `#7D7362` | on canvas / surface | **4.36 / 4.67** PASS (≥3:1 required) |
| focus | light | `#0E7C7B` | on canvas `#FAF7F0` | **4.69:1** PASS |
| danger | light | `#A32B1E` | on canvas | **6.72:1** PASS |
| success | light | `#1F6B3A` | on canvas | **6.09:1** PASS |
| warning | light | `#8A5A00` | on canvas | **5.54:1** PASS |
| canvas / surface / sunken | dark | `#14120F` / `#1D1A16` / `#242019` | — | — |
| text | dark | `#F2EDE3` | on canvas / surface | **16.02 / 14.86** PASS |
| muted text | dark | `#A79D8E` | on canvas / surface | **6.99 / 6.48** PASS |
| action | dark | `#5EEAD4` | `#08201F` on it | **11.48:1** PASS |
| accent | dark | `#F0B429` | on canvas | **10.03:1** PASS |
| border-control | dark | `#7A705E` | on canvas / surface | **3.83 / 3.55** PASS |
| danger / success / warning | dark | `#FCA5A5` / `#86EFAC` / `#FCD34D` | on canvas | 9.85 / 13.32 / 12.97 PASS |

Meaning is never carried by color alone: every state also has an icon, a Persian label, or a border change.

### Typography

| Role | Family / fallback | Scale / weight / leading | Purpose |
|---|---|---|---|
| display | Estedad Variable | 600–800, `clamp(1.9rem, 1.2rem + 2.6vw, 3.1rem)`, leading 1.25 | course title, page titles |
| body | Vazirmatn Variable | 400–600, 1.0625rem/1.95 mobile → 1.125rem desktop | reading and UI |
| math | KaTeX (Computer Modern, bundled) | KaTeX metrics | formulas |
| utility / data | Vazirmatn Variable | 500–700, 0.6875–0.8125rem, tracking 0.06em | labels, numerals, meta |

Fonts are self-hosted through `@fontsource-variable/*` (SIL OFL 1.1) with `system-ui` and
`Tahoma` fallbacks so hierarchy survives if webfonts fail. Persian numerals (۰–۹) are used for all UI
counting via a `fa` counter style. Vazirmatn carries `font-variant-numeric` fallbacks for the few
Latin/math contexts.

### Geometry and depth

- **Spacing/rhythm:** 4 px base; section rhythm 8/12/16/24/32/48/64. Content blocks separate with
  space + hairline, not with nested cards.
- **Grid/content measure:** 12-column outer grid; reading column capped at **68ch** (Persian text
  needs a slightly wider measure than Latin), formula plates may bleed 1 column wider on ≥1024 px.
- **Radius logic:** small and consistent — 4 px controls, 8 px plates, 999 px only for the search
  field pill. Nothing above 12 px; the aesthetic is paper, not plastic.
- **Border/shadow logic:** hairlines (1 px) do the structural work. One elevation token,
  `--shadow-plate`, is reserved for floating layers (mobile sheet, dropdown). No glassmorphism.
- **Icon/media treatment:** 1.5 px stroke, 20 px grid, `currentColor`, no filled decorative icons.
  Diagrams are inline SVG with the accent hue; figures carry an optional Persian caption.

### Media and art direction

- **Illustration / data-visualization language:** flat, thin-stroke SVG in the accent hue on the sunken
  surface, with axis labels in the body face. Scientific diagrams, not decorative illustration.
- **Icon family:** single inline-SVG family, 20 px grid, 1.5 px stroke, `currentColor`.
- **Asset source/ownership:** all icons and figures are authored in this repository (MIT-style
  original work); fonts are OFL; no stock photography is used.
- **Responsive art direction:** figures scale by width with a `max-width`; ASCII-art/fenced blocks
  scroll inside their own container rather than widening the page.
- **Fallback:** if a figure asset is missing the plate renders an accessible dashed placeholder with a
  Persian note — never a broken image icon.

## Composition and responsiveness

- **Desktop composition:** centered shell (max 1200 px) + reading column; persistent start-edge section
  rail; a slim sticky contents rail on ≥1280 px only.
- **Mobile recomposition:** single column; section rail becomes a ۲-px start-edge bar per section;
  tables become horizontally scrollable inside their own container with a shadow affordance;
  the search field becomes a full-width row under the brand; navigation collapses to a bottom-safe
  disclosure sheet, not a hamburger-only dead end.
- **Dense/long-content behavior:** MDX components stack with hairline separators; `overflow-x` is
  contained per component; tables and code never widen the page.
- **Supported viewport/device baseline:** 360–1360 px as listed in the brief; verified in-browser.
- **RTL/localization behavior:** `dir="rtl"` on `<html>`; logical CSS properties only
  (`margin-inline`, `padding-inline`, `inset-inline`) so components stay direction-agnostic; KaTeX
  wrapped in an LTR isolate so Persian paragraphs with Latin math do not reorder; Persian numerals
  via CSS counters.

## Components and states

| Component / pattern | Variants | Required states | Reuse or change |
|---|---|---|---|
| `Callout` | note, tip, warning, danger | default | new |
| `Formula` | inline, block | default, copied | new |
| `FormulaBreakdown` | term list | default | new |
| `Definition` | block | default | new |
| `Misconception` | — | default, collapsed on mobile | new |
| `WorkedExample` | — | collapsed, revealed | new |
| `StepReveal` | — | collapsed, revealed, all-revealed | new |
| `Quiz` | mcq, true-false | unanswered, correct, incorrect, completed, retry | new |
| `GlossaryTerm` | inline, block | default | new |
| `Prerequisite` | — | default, missing-reference | new |
| `InteractiveFigure` | — | loading, ready, missing | new |
| Buttons / search field | primary, ghost, quiet | default, hover, focus, active, disabled | new |

Required journey states: **loading** (search index load + figure), **empty** (search with no matches),
**error/retry** (search failure, quiz submit without selection), **success** (quiz scored, quiz complete),
**disabled** (reveal-before-attempt, submit with no selection), **focus** (visible ring on every control),
**permission/offline** (progress stored locally; a private-mode failure degrades to non-persistent and
says so rather than crashing).

## Motion and feedback

- **Orchestrated moment:** the reveal cascade in `WorkedExample` — steps fade up in sequence (60 ms
  stagger) once, and the final answer plate gets one short highlight sweep. Nothing else animates on
  scroll.
- **State-transition motion:** 120–180 ms `cubic-bezier(0.2, 0.8, 0.2, 1)`; accordion/answer feedback
  only. Search results fade in once.
- **Duration/easing tokens:** `--motion-fast: 120ms`, `--motion-base: 180ms`, `--ease-out`.
- **Reduced-motion alternative:** `@media (prefers-reduced-motion: reduce)` sets all transition/animation
  durations to 1 ms and disables the sweep; reveals become instant, never hidden.
- **Sound/haptics:** none.

## Content voice

- **Vocabulary and tone:** Persian, formal-but-warm, second person singular, textbook register. Short
  sentences. Explain before generalising.
- **Action-label rules:** verbs in the imperative — «گام بعدی را ببینید», «بررسی پاسخ», «پاک کردن».
  Never «کلیک کنید» for a touch-friendly action label.
- **Error/empty-state rules:** state what happened and the next action, in Persian, without an English
  code. Never a raw exception message.
- **Realistic content fixtures:** the repository ships a small, genuinely Persian sample course
  (`مبانی حساب دیفرانسیل`) with real formulas, worked examples, quiz questions and glossary terms —
  enough to render every state, while making no claim that it is a real course.

## Quality budgets

- **Accessibility target:** WCAG 2.2 AA. Contrast table above is measured evidence.
- **Text/non-text contrast target:** text ≥ 4.5:1; interactive control borders ≥ 3:1 (measured).
- **Keyboard/focus/touch target:** full keyboard operation, visible `:focus-visible` ring on every
  control, ≥ 44×44 px touch targets, meaning never by color alone.
- **Performance target:** static HTML by default; KaTeX rendered at **build time** so math costs zero
  client JS; React islands only for search, quiz, reveals, and progress. Lab budget: LCP ≤ 2.5 s,
  INP ≤ 200 ms, CLS ≤ 0.1; JS budget ≤ 120 KB gzip of first-party JS on a content page.
- **Pre-release lab budget:** enforced by `scripts/check-budgets.mjs` against `dist/`.
- **Supported browsers/input modes:** evergreen Chromium/Firefox/Safari; touch and keyboard; dark and
  light; 200 % zoom.

## Screen acceptance

| Flow / screen | Critical states | Viewports/locales | Visual proof |
|---|---|---|---|
| Homepage | front matter, dot-leader index, empty-state-free | 390, 1360 / fa-RTL | capture + inspect |
| Lesson | reading rail, formula, reveal, quiz, misconception | 360, 1360 / fa-RTL | capture + inspect |
| Concept / formula | definition plate, formula plate, backlinks | 390, 1360 / fa-RTL | capture + inspect |
| Practice | unanswered, incorrect, correct, completed | 390 / fa-RTL | capture + inspect |
| Search | idle, results, empty | 360, 1024 / fa-RTL | capture + inspect |
| Glossary | dense alphabetical list | 360, 1360 / fa-RTL | capture + inspect |

## Decisions intentionally deferred

- Course-specific accent palettes beyond the `theme.colors` override (Physics vs Calculus motifs) —
  the override mechanism ships; distinct per-course motif art is deferred until a real course needs it.
- Any server-side search, analytics, or user accounts — explicitly out of scope for a static template.

## Decision log

| Date | Decision | Evidence / rationale | Revisit when |
|---|---|---|---|
| 2026-10-05 | Adopt "illuminated worksheet" thesis + ruled teaching margin + dot-leader contents as the cross-course signature | Brief demands a recognizable shared identity and forbids generic dashboard aesthetics | If a future course's content is genuinely not book-shaped |
| 2026-10-05 | Render KaTeX at build time (`renderToString`) instead of shipping KaTeX JS | Gives beautiful math with zero client JavaScript, satisfying both "beautiful mathematical content" and "JS only for real interaction" | If interactive math typesetting is genuinely required |
| 2026-10-05 | Self-host Vazirmatn + Estedad via `@fontsource-variable` instead of a font CDN | No required external runtime service; avoids render-blocking third-party request; OFL licensed | Never, unless licensing changes |
| 2026-10-06 | Homepage desktop/tablet recomposition without a new visual system [proposed] | Inspected 1360/1024/768 captures: `CourseLayout` wide mode still capped the slot at 68ch with no centering, so the whole homepage stuck to the RTL start edge and left a ~500px void on desktop; footer 3-col at 768 squeezes the creator cell into a single-button-per-row tower. Fix: true full-shell hero (7/5), 2-col roadmap previews + contents entries at `lg`, capped centered figure below `lg`, footer 2-col with full-width creator on tablet. No token, palette, or thesis change. | If a real course ships 5+ sections and the 2-col index reads poorly |
| 2026-10-05 | Separate `--color-border-control` from decorative `--color-border` | Measured: `#D8D0C0` fails 3:1 for controls, `#7D7362` passes at 4.36:1 | If a course overrides borders |
| 2026-10-06 | Template slice: no new visual system **[owner direction preserved]**; new surfaces reuse existing tokens | Brief requires the illuminated-worksheet identity to stay fixed; palette/thesis/type/motion unchanged | If a real course needs a motif beyond the accent override |
| 2026-10-06 | Command palette as a quiet floating dialog; TOC as dot-leader-consistent rail + mobile disclosure; formula copy as a ghost button **[proposed]** | Must not introduce glassmorphism, badges, or cards that the brief rejects; appendix surfaces (map, palette) inherit paper/surface/hairline roles | If palette usage shows the dialog needs grouping or sections |