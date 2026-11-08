---
name: quick-fix
description: "Handle a small, clear, low-risk change in this repository without unnecessary planning."
whenToUse: "The task is narrow, the cause is easy to locate, acceptance is obvious, and the change has no security, data, API, architecture, or content-contract impact."
---

# Quick fix

Use this for a localized defect, a small test addition, a copy or label edit, or
an obvious correction in one or two files. If the cause is uncertain, the change
crosses a contract boundary, or it affects security, data, public behavior,
content schemas, links, RTL, or the static-first budget, stop and use `spec` and
`build` instead.

## Project context

- Read the closest `AGENTS.md` and the document that owns the area:
  `docs/QUALITY.md` for acceptance, `docs/DESIGN.md` for UI, and
  `docs/CONTENT-CONTRACT.md` or `docs/AI-CONTENT-PROMPT.md` for content.
- This repository is static-first. Never add client JavaScript to render content
  that must be readable without it.
- Content is validated at build time. A content edit is not a "no-check" edit:
  run `npm run validate`.

## Procedure

1. Inspect `git status --short`, the exact target, and the nearest relevant
   check. For code, trace the symbol and its callers with focused reads and
   search; for content, read one existing file of the same type.
2. Confirm the failure or requested behavior from code or an actual check. Do
   not guess the cause.
3. Implement the smallest coherent fix. Preserve unrelated behavior, content,
   and user changes.
4. Add or update a test only when it would detect the defect or protect the
   intended behavior. Use `test-design` when coverage is non-obvious; `No new
   test` is a valid outcome.
5. Run the narrowest real check that exercises the change:
   - content only: `npm run validate`;
   - pure logic: `npm run test`, or the exact `vitest` file;
   - built output, links, or budgets: `npm run build`, then
     `npm run test:dist`, `npm run validate:links`, or `npm run budgets`;
   - UI interaction: `npm run build`, `npm run preview`, then
     `node scripts/interaction-qa.mjs` (or `visual-qa.mjs` for layout).
6. Inspect the final diff and run `git diff --check`. Remove debug output,
   accidental edits, and unrelated formatting.
7. Report the change, the exact check (command, working directory, exit code),
   and anything not verified.

## Guardrails

- Do not add dependencies, change public interfaces, alter content schemas, or
  perform broad renames as part of a quick fix.
- Do not weaken, skip, or delete a failing test to make the result green.
- Do not claim a check passed unless it ran. A missing browser, preview server,
  or tool is `blocked`, not `passed`.
- If the fix expands beyond the original scope, switch to `build` and state why.

## Completion report

```text
Change: <what changed and where>
Checks: <command> (cwd, exit code) — <result>
Not verified: <unproven, blocked, or unexecuted checks, or "none">
```
