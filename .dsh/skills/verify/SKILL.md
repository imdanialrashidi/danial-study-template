---
name: verify
description: "Discover and run the project's real checks, then report inspectable evidence without inventing commands."
whenToUse: "A change is ready for validation, a user asks whether it works, or existing evidence must be checked before completion."
---

# Verify

Verification is execution plus evidence. A plausible explanation is not a passed
check.

## Discover the real commands

Read `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `.github/workflows/`, and
`package.json`. Use the commands those files define. Do not assume another
project's language, package manager, or test layout.

This repository's canonical commands are:

| Purpose | Command |
| --- | --- |
| Install | `npm ci` |
| Content validation | `npm run validate` |
| Types | `npm run typecheck` |
| Lint | `npm run lint` |
| Unit tests | `npm run test` |
| Script tests | `npm run test:scripts` |
| Build | `npm run build` |
| Built-output tests | `npm run test:dist` (after build) |
| Link validation | `npm run validate:links` (after build) |
| Budgets | `npm run budgets` (after build) |
| Full gate | `npm run ci` |
| Template/workflow self-check | `bash scripts/verify.sh` |
| Browser QA | `npm run preview`, then `node scripts/visual-qa.mjs` and `node scripts/interaction-qa.mjs` |

## Select checks

Choose the smallest set that covers the change, then widen for risk:

- **Focused:** `npm run validate` for content; `npm run test` for changed pure
  logic; `npm run typecheck` and `npm run lint` for code shape.
- **Integration:** `npm run build` plus `npm run test:dist`, `npm run
  validate:links`, and `npm run budgets` when the change affects rendered
  output, links, or assets.
- **Negative paths:** invalid input, denial, cancellation, timeout, empty state,
  storage failure, or permission failure where the change touches them.
- **Security-sensitive:** secret handling, content trust boundary, injection
  surfaces, destructive operations.
- **Manual/runtime:** `npm run preview` and the browser QA scripts for the
  accepted journey. Mark it unproven or unexecuted if you did not actually run
  it.

## Execute and record

For every check, retain the exact command, working directory, exit code, and the
part of the output that supports the conclusion. Do not pipe a command through
something that hides its exit status.

Do not modify source code while acting as the verifier. If a check exposes a
defect, return to `build` and rerun the affected checks afterward.

## Classify every check

- **passed** — the command ran and succeeded, with inspectable evidence.
- **failed** — the command ran and reported failure.
- **blocked** — a prerequisite (tool, service, credential, platform) prevented
  execution. Name it.
- **unproven** — a claim is supported only by inspection or reasoning, not by
  execution.
- **unexecuted** — the check was available or planned but did not run, was
  skipped, or was cancelled.

One check may be passed while another is blocked. Do not collapse the result
into a single "all good" claim. A missing tool is not a pass. A skipped test is
not a pass.

## Map evidence to acceptance

For each acceptance criterion, cite the check that covers it. If no check covers
a criterion, say so. Distinguish a regression test that actually exercises the
behavior from a test that merely imports the module.

## Report

```text
Verdict: <pass | fail | incomplete>

Checks:
| Check | Command | cwd | Exit | Result |
| --- | --- | --- | --- | --- |

Acceptance criteria:
- <criterion> — <evidence or gap>

Not executed / blocked:
- <check> — <reason>

Unproven:
- <claim> — <why inspection is insufficient>
```
