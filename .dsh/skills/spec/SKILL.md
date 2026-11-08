---
name: spec
description: "Turn a request into a concise outcome, acceptance criteria, scope, constraints, and verification strategy for this repository."
whenToUse: "Requirements are ambiguous, the change is cross-cutting, or acceptance depends on a decision that should be made before code is written."
---

# Spec

Use this skill only when the task needs a decision or shared understanding. For
a clear, small fix, skip it and implement directly with `quick-fix` or `build`.

## Produce only what is needed

1. **Outcome** — the user-visible or system-visible result, in one or two
   sentences.
2. **Acceptance criteria** — numbered, observable, and testable. State what a
   failing case must do, not only the happy path.
3. **Scope** — what is included and what is explicitly excluded.
4. **Constraints** — compatibility, security, data, performance, migrations,
   dependencies, and repository conventions that bound the solution.
5. **Verification strategy** — the actual checks that will prove each criterion.
   Name candidate commands or test layers, but do not invent commands that the
   project does not provide.
6. **Open questions** — only questions that materially change implementation.
   Recommend a default answer and its consequence.

## Project constraints to check

- **Static-first.** No page may require JavaScript to be readable; islands add
  behaviour, never content.
- **Content contract.** MDX frontmatter is validated by Zod; cross-references,
  fragments, and declared sections are validated by
  `scripts/validate-content.mjs`. A dangling reference is a build error.
- **Links.** Every internal link goes through `withBase()`; `BASE_PATH` must be
  honoured for project-site deployments.
- **Identity and theming.** Content identity is `<kind>/<slug>`; a course themes
  itself only through `theme.colors` in `src/config/course.ts`.
- **RTL and accessibility.** Persian `fa`, `dir="rtl"`, WCAG 2.2 AA, keyboard
  operation, visible focus, and no meaning carried by colour alone.
- **Budgets.** No KaTeX runtime JavaScript; first-party JS ≤ 120 KB gzip, CSS ≤
  90 KB gzip, page HTML ≤ 200 KB. Enforced by `scripts/check-budgets.mjs`.
- **No backend, analytics, or runtime external service.** Progress is local to
  the browser.

Read `docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN.md` for
user-facing work, plus `docs/QUALITY.md` and the owning content or code
contracts.

## Rules

- Keep a small spec to a short list. A large specification is justified only by
  genuine uncertainty or high risk.
- Prefer existing behavior and interfaces. Do not invent abstractions for a
  single use.
- When two options are close, choose the lower-risk, reversible one and record
  why.
- Do not write code or start implementation while the acceptance criteria are
  unresolved.
- Stop when the criteria are clear enough to implement and verify. Do not turn
  this into a design document, task tracker, or multi-page plan.
- Hand off the outcome, acceptance criteria, constraints, and verification
  strategy to `build`.

## Output template

```text
Outcome:
Acceptance criteria:
1.
2.
Scope: in / out
Constraints:
Verification strategy:
Open questions (with recommendation):
```
