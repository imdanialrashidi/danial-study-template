# Workflow

Project execution model for DSH sessions. `AGENTS.md` is the always-loaded
entry point; this file owns the decision model; the `.dsh/skills` procedures own
execution; [docs/QUALITY.md](QUALITY.md) owns the evidence standard.

## Principles

1. **One primary writer.** A change has one writer responsible for the working
   tree. Delegated agents are for independent work such as review or
   investigation, not parallel edits to the same files.
2. **Plan only as much as needed.** Planning is a tool for complexity and risk,
   not a mandatory stage.
3. **Small, coherent changes.** Tie every change to explicit acceptance criteria
   and keep unrelated refactors out.
4. **Evidence over confidence.** Completion depends on executed checks and
   inspectable output, not a plausible narrative.
5. **Independent review where it adds value.** Review is risk-based and
   evidence-driven, not a ceremony.
6. **Repository-local context.** Instructions and project knowledge live with
   the code, stay concise, and have one owner per fact.
7. **Native DSH first.** Use DSH's instruction loading, skills, tools,
   permissions, and optional subagents. Do not build parallel orchestration.
8. **No silent authorization.** Workflow text never grants permission, bypasses
   an approval policy, or makes a sensitive action look routine.
9. **Project commands are discovered, not assumed.** This repository is Astro +
   npm; do not import another project's toolchain or test layout.

## Decision model

| Situation | Path | Required evidence | Independent review |
| --- | --- | --- | --- |
| Small, clear, low risk | Inspect → implement → targeted verification → diff review (`quick-fix`) | A real check for the changed behavior and the inspected diff | Not required |
| Normal feature | Brief acceptance criteria → implement (`build`) → verify → review | Criteria mapped to checks; diff self-review | Optional |
| Complex change | Inspect dependencies and architecture → concise plan → implement in bounded steps → verify each stage → review | Staged evidence; integration or contract checks where relevant | Recommended |
| High-risk change | Spec → implement with negative-path tests → verify → security review → independent review | Negative paths, failure/rollback evidence, security review | Required when a reviewer is available |
| Existing change review | Inspect the actual diff and context → review only | Findings with scenarios; no edits during review | Optional second reviewer |

Risk is set by the change, not by the author's confidence. A small diff in
authentication, billing, migrations, CI, installers, or data deletion is still
high risk. In this repository, content schema changes, `withBase()`/`BASE_PATH`
changes, static-first regressions, and secret handling are also high risk.

## Execution protocol

### 1. Classify

Use the decision model above. Load only the skill that matches the phase:
`quick-fix`, `spec`, `build`, `verify`, `review`, or `test-design`. Do not load
every skill.

### 2. Establish the acceptance contract

For normal features and larger work, state a compact contract before editing:

```text
Goal:
Non-goals:
Acceptance:
- A1 ... -> proof: ...
- A2 ... -> proof: ...
- A3 ... -> proof: ...
```

Good criteria describe user-visible or externally observable behavior. Include
the denied, invalid, empty, cancelled, or rollback case when those paths matter.
Do not accept placeholder buttons, stub handlers, fake persistence, TODO
implementations, or display-only controls as satisfying functional criteria.

For a bug, characterize the failure before changing code when practical. For
performance work, capture a baseline. For UI work, include the critical journey
and the important loading, error, empty, and permission states.

### 3. Discover with a context budget

Start from identifiers, not bulk context:

1. `AGENTS.md` and the document that owns the area;
2. focused code reads and exact search;
3. the nearest existing tests and the project commands;
4. real runs through `bash` and the npm scripts;
5. `web_search` and `web_fetch` for current upstream facts.

There is no guaranteed LSP or eval tool. Use focused reads, `grep`, and `node`
instead. Use a `subagent` only when the relevant surface or cross-module flow is
genuinely unclear; otherwise investigate directly.

### 4. Implement one coherent vertical slice

Prefer a complete end-to-end behavior over many half-finished layers. Preserve
the architecture and the non-negotiable invariants listed in `AGENTS.md`.
Verify as you go with the narrowest real command. When tests change, use
`test-design` and its Test Value Gate.

### 5. Evaluate independently

After the slice is functionally complete and targeted checks pass, evaluate it
against the acceptance contract and `docs/QUALITY.md`. Prefer the `review` skill
for non-trivial user-facing, cross-module, production-bug, or material
regression work. Use a fresh-context `subagent` when independent review adds
value; `subagent_fork` is not independent because it inherits this conversation.

Default to at most **two evaluator/repair rounds**. If a blocker or major issue
remains after two evidence-driven repair rounds, stop repeating the same loop:
reassess the contract or root cause, update an execution plan, or report the
blocker.

### 6. Verify and report evidence

Load `verify`. Map every acceptance criterion to evidence and use exactly one of
these statuses:

- **passed** — the check ran and succeeded, with inspectable output;
- **failed** — the check ran and reported failure;
- **blocked** — a missing prerequisite prevented execution; name it;
- **unproven** — the claim rests on inspection or reasoning, not execution;
- **unexecuted** — the check was available or planned but did not run.

Never merge these into one status. `UNPROVEN` is not ready.

### 7. Deliver (opt-in)

Solo default: leave the proven change in the working tree and report its state.
No commit, push, branch, or pull request unless the current request explicitly
asks for delivery. When it does, follow [docs/GIT_POLICY.md](GIT_POLICY.md).
A missing credential blocks delivery, not safe local implementation; report both
states accurately.

## Verification lanes

Pick the cheapest lane that proves the change; do not jump to the full gate by
default.

| Lane | Command | Use when |
| --- | --- | --- |
| Affected | `npm run validate && npm run test` | Content or pure logic changed |
| Feature | `npm run validate && npm run test && npm run build && npm run test:dist` | Rendered output or a user-facing flow changed |
| Output extras | `npm run validate:links` and `npm run budgets` | Links, assets, or performance budgets changed |
| Full | `npm run ci` | Broad, high-risk, release-facing, or workflow change |
| Template | `bash scripts/verify.sh` | `AGENTS.md`, `.dsh/skills`, `docs/WORKFLOW.md`, or the verification script changed |
| Browser | `npm run preview`, then `node scripts/visual-qa.mjs` / `node scripts/interaction-qa.mjs` | Layout, RTL, or an interactive journey must be observed |

An unmatched file (no adjacent test, generated artifact, config without a
validator) is treated conservatively: run the feature lane, or the full gate
when the change is load-bearing.

## Review and repair

Review looks for actionable defects with a concrete failure scenario and
location. It is not a style pass. For risky changes, use a fresh-context
`subagent` for independent review and, where warranted, a separate validation
pass for blocker or major findings. Repair is capped at two rounds; if
unresolved findings remain, stop and reassess. Never weaken tests or suppress a
valid finding to get a clean report. See the `review` skill and
[docs/QUALITY.md](QUALITY.md).

## Failure recovery

If the same approach fails twice without new evidence, climb instead of
looping:

1. **Re-characterize** — reproduce the failure more precisely before changing
   anything else.
2. **Shrink scope** — cut to the smallest still-meaningful behavior and re-prove
   it.
3. **Change the tool** — use a focused read or search, a real `node` or npm
   command, or a fresh `subagent` instead of guessing.
4. **Reassess the contract** — the criterion may be wrong or blocked; say so
   and mark it `BLOCKED` or `UNPROVEN`.
5. **Durable state** — for multi-session work, write the current state to
   `docs/exec-plans/active/` and continue in a fresh session.

## Context and continuity

DSH has no native handoff command. For work that must cross sessions:

1. write the current state to `docs/exec-plans/active/<short-slug>.md` using the
   structure in [docs/exec-plans/README.md](exec-plans/README.md);
2. start a fresh DSH session and read that plan first;
3. keep the working tree and actual checks authoritative if the plan goes stale.

Do not store secrets, credentials, or personal data in plans or skills. Keep the
always-loaded instructions short and link to detail instead of duplicating it.

## Completion

A change is ready to report when:

- every acceptance criterion is met or explicitly reported as unmet;
- every planned check has a status and the evidence is available;
- the diff has been reviewed and actionable findings are resolved or explicitly
  accepted with an owner and reason;
- documentation owned by the change is current;
- no known blocker is hidden behind a success summary.
