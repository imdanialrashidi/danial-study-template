---
name: review
description: "Review a diff for actionable bugs, regressions, security problems, and contract violations with evidence."
whenToUse: "A change is ready for review, a diff must be assessed before completion, or an existing change is being reviewed without modification."
---

# Review

Review finds defects. It is not a style pass, a summary of the diff, or an
approval ceremony.

## Establish the review scope

1. Read the actual diff and enough surrounding code to understand the change.
   Do not review from the commit message, a summary, or file names alone.
2. Re-establish the base and head. If the base moved or a merge occurred, read
   the affected range again.
3. Read the acceptance criteria, `AGENTS.md`, and the project documents that own
   the changed behavior: `docs/QUALITY.md`, `docs/ARCHITECTURE.md`,
   `docs/DESIGN.md`, and the content contract when relevant.
4. Note pre-existing defects separately. Do not attribute them to the author.

Do not modify code during the review phase. If you find a defect, report it;
fixes belong to `build`.

## What to look for

Prioritize, in this order:

1. Security, authorization, secret exposure, injection, and unsafe defaults.
2. Data loss, corruption, migration failures, and irreversible operations.
3. Correctness bugs and regressions in changed or adjacent behavior.
4. Broken contracts: content schema, URL/base-path behavior, static-first
   rendering, accessibility semantics, lifecycle, and compatibility.
5. Missing or misleading verification for a risky path.
6. Explicit project-standard violations that have a material consequence.

Project-specific risk areas:

- **Content trust boundary.** MDX content is untrusted; KaTeX runs with
  `trust: false`; `assertTeXIntact` must reject stripped backslashes; no raw
  HTML sinks may be introduced without an independent safety argument.
- **Deployment base path.** Every internal link must go through `withBase()`;
  `BASE_PATH=/<repo>` builds and link validation must still pass.
- **Static-first.** A page must remain readable without JavaScript; islands add
  behaviour, never content. No KaTeX runtime JavaScript.
- **RTL and accessibility.** `lang="fa"`, `dir="rtl"`, one `<h1>`, visible focus,
  keyboard operation, 44 px touch targets, contrast, reduced motion.
- **Persistence.** Progress is `localStorage`-only, must degrade honestly, and
  must not become a server or cross-device feature.
- **Identity and theming.** No subject coupling; a course themes itself only
  through `theme.colors`; creator identity comes from `src/config/site.ts`.
- **Budgets.** JS/CSS/HTML budgets and no third-party runtime calls.

Do not report formatting preferences, naming taste, or speculative refactors
unless an explicit repository rule requires it or the issue causes a real
defect.

## Finding standard

A finding is admissible only when all of these are present:

- **Location** — file and line or the tightest relevant range.
- **Failure scenario** — concrete inputs, state, or sequence that triggers the
  problem.
- **Impact** — what breaks, for whom, and how severely.
- **Severity** — `blocker` for security, data loss, or broken core behavior;
  `major` for a likely user-visible regression or contract violation; `minor`
  for a real but low-impact defect.
- **Fix** — the smallest actionable correction, not a demand to redesign the
  system.
- **Evidence** — the code path, test result, or reproduction that supports the
  claim.

If you cannot state a realistic failure scenario, do not post the finding. "This
might be a problem" and "consider improving" are not review findings.

```text
[severity] path/to/file:line — short title
Scenario: <concrete trigger>
Impact: <observable consequence>
Fix: <smallest correction>
Evidence: <code path, test, or reproduction>
Confidence: high | medium
Pre-existing: yes | no
```

## Keep the signal high

- Deduplicate findings that share one cause. Report the cause once and note every
  affected location.
- Do not repeat a finding that was already fixed or already reported in the
  current review cycle.
- Do not invent requirements. A preference is not a contract violation.
- Prefer one substantiated blocker over a long list of weak observations.
- If the change is clean, say so and state what you checked. Do not manufacture
  findings to appear thorough.

## Independent review and validation

A fresh-context DSH `subagent` is the preferred independent reviewer when it is
available. Use `subagent`; do not use `subagent_fork` for independence because
it inherits completed history. If only a history-seeded child is available,
treat the result as assisted self-review, not independent review. Give the
child:

- the repository path and exact base/head;
- the acceptance criteria and relevant project documents;
- the instruction to inspect the diff and read code without editing;
- the finding schema above and the instruction not to report style-only issues.

A fresh child does not see this conversation. Provide all necessary context in
the prompt. The start is asynchronous; do not poll it, and collect the
completion notice when it settles.

For a high-risk change, or when a reported blocker is uncertain, run a separate
validation pass: ask a fresh child or re-read the code yourself with the goal of
disproving each finding. Validate only the findings that matter; do not repeat
the entire review. Record the validation outcome per finding.

If independent review is unavailable, perform a disciplined self-review and
report independent review as **unexecuted**. Do not claim it happened.

## Repair loop

- Fix findings in `build`, then rerun the affected verification.
- Re-review only the new diff and the immediate context of the fix, not the
  entire previous review.
- Start with a maximum of **two repair rounds**. If unresolved findings remain
  after two rounds, stop and reassess the approach with the user: narrow the
  scope, change the design, or accept the risk explicitly.
- Never weaken, skip, or delete a test, suppress a finding, or broaden an ignore
  rule to obtain a clean review.
- Do not reopen fixed findings unless the fix introduced a new, demonstrated
  problem.
- Record accepted risks with the owner and reason. Silence is not acceptance.

## Report

```text
Scope: <base..head and paths reviewed>
Evidence reviewed: <diff, tests, docs>
Findings: <count by severity>
Independent review: <performed by fresh subagent | unexecuted>
Validation: <performed | not performed> — <scope>
Verdict: <ready | changes required | blocked>
```

List findings in severity order. End with residual risks and checks that were not
executed.
