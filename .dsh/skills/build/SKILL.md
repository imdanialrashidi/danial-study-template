---
name: build
description: "Implement a requested change end to end as one coherent vertical slice, not just a plan."
whenToUse: "The change has clear enough acceptance criteria to implement, including normal features and bounded complex work."
---

# Build

Implement the change. Do not stop at a plan when the task can be implemented
safely.

## Before editing

1. Read the closest `AGENTS.md`, the relevant project documents, and the
   existing code around the change. For UI work read `docs/DESIGN.md` first; for
   content work read `docs/AI-CONTENT-PROMPT.md` and
   `docs/CONTENT-CONTRACT.md`.
2. Identify the existing architecture, patterns, dependencies, and tests that
   the new behavior must fit. Read `docs/ARCHITECTURE.md` before changing
   cross-cutting behavior.
3. Confirm the acceptance criteria. If they are missing and the task is not
   small, use `spec` first.
4. Decide the smallest coherent slice that delivers the requested behavior. For
   complex work, write a short plan with bounded steps and a verification point
   for each step.

## Implement

- Keep one primary writer for the working tree. Do not run parallel code-writing
  agents on the same files.
- Follow existing interfaces and dependency choices. Do not add a library for
  something the repository already solves (search, math rendering, progress
  storage, URL handling).
- Preserve unrelated behavior. Avoid drive-by refactors, mass formatting, and
  speculative abstractions.
- Preserve the non-negotiable invariants:
  - static-first; interactive islands add behaviour, never content;
  - every internal link goes through `withBase()`;
  - every entry has a globally unique `qualifiedId` (`<kind>/<slug>`);
  - the engine never branches on a discipline;
  - math is pre-rendered; no KaTeX runtime JavaScript is emitted;
  - colour is never the only carrier of meaning;
  - semantic tokens live in `src/styles/theme.css`; a course themes itself only
    through `theme.colors`.
- Handle the failure paths required by the acceptance criteria: validation,
  empty state, error reporting, cancellation, permissions, storage failure, and
  cleanup where applicable.
- Add or update tests when they protect a changed behavior or a realistic
  failure. Use `test-design` when coverage is non-obvious; `No new test` is a
  valid outcome.
- Update the owning documentation when a contract, command, behavior, or
  architecture fact changes. Do not create a second source of truth.

## Verify as you go

- Run focused checks after each meaningful stage, not only at the end:
  - `npm run validate` for content;
  - `npm run test` for pure logic;
  - `npm run build` for rendering;
  - `npm run test:dist`, `npm run validate:links`, and `npm run budgets` after a
    build when the change affects output, links, or assets.
- If a check fails, diagnose it. Do not hide it with a retry, a skipped test, or
  a broader pass.
- For a complex change, verify each bounded step before starting the next.

## Finish

1. Read the complete diff. Remove temporary debugging, generated noise, and
   unrelated edits.
2. Confirm every acceptance criterion is addressed or explicitly reported as
   unmet.
3. Load `verify` for the final evidence and `review` for the diff. Fix
   actionable findings in `build`; re-review only the new changes.
4. Report what changed, what was executed, and what remains unproven, blocked,
   or unexecuted.

## Stop conditions

Stop and report instead of forcing completion when:

- a required dependency, credential, service, browser, or tool is unavailable;
- the implementation needs a product or architecture decision that the user
  owns;
- the change would require weakening a test, bypassing a permission control, or
  modifying unrelated code;
- two repair rounds have failed to resolve a review finding and the approach
  needs reassessment.
