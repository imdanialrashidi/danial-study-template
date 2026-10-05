# Pi Production Workflow Template

A compact, evidence-driven harness for [Pi Coding Agent](https://pi.dev/) focused on high-quality implementation, model-neutral routing, bounded independent evaluation, low-resource verification, distinctive production-grade frontend design, and scoped automatic PR delivery.

## What this template provides

- a short progressive-disclosure map in `AGENTS.md` instead of a giant always-loaded manual;
- a detailed on-demand harness playbook in `docs/HARNESS.md`;
- a project quality/evaluator contract in `docs/QUALITY.md`;
- a durable product-specific visual contract in `docs/DESIGN.md`;
- acceptance-driven `/build`, `/review`, and `/ship` workflows;
- `/discover` → `/design` → `/build-ui` → `/design-review` workflows for moving from idea to a functional, visually distinctive interface;
- durable execution plans plus `/handoff` and `/resume` for long-running work across fresh contexts;
- Pi-native project settings in `.pi/settings.json`;
- a project launcher (`./p`) with a nine-tool core and capability-based specialist loading;
- a model-neutral runtime that bounds implicit large-file reads, stops blind identical retries, and preserves a compact continuity capsule across resume/compaction;
- Pi-native capability-aware tool schemas for the reviewed runtime;
- bounded read-heavy subagents through the pinned `pi-sub-agent` package;
- on-demand LSP, maintained Context7-backed documentation search, and web search/fetch;
- lazy Playwright MCP browser exploration for localhost and public HTTP(S) pages, with focused page evaluation;
- repository-local Playwright Test (when the real project uses it) for durable regression coverage;
- a visible todo panel for genuinely multi-step work;
- a tested full-workspace guard that blocks secrets, destructive host actions, publication/deployment, browser file exfiltration, and arbitrary Git/GitHub mutation while permitting the reviewed fixed-branch PR helper;
- a low-ceremony `/skill:quick-fix` path plus specialized skills for frontend design, behavior-sensitive test design, verification routing, risk review, and browser QA;
- a doctor/CI check that validates package pins, security posture, and always-loaded context budgets;
- a 17-case RPC evaluation harness with deterministic safety/scope graders, trace/efficiency metrics, baseline comparison, a one-trial default smoke run, and opt-in repeated trials for promotion decisions.

## Harness philosophy

The workflow follows a simple loop:

```text
intent
→ classify
→ acceptance contract
→ focused discovery
→ one primary writer
→ targeted verification
→ independent evaluator when justified
→ bounded repair
→ final gate
→ acceptance → evidence report
```

For long-running work:

```text
execution plan
→ incremental work
→ /handoff
→ fresh context
→ /resume
```

For a visually significant product slice:

```text
product thesis
→ design contract
→ functional UI slice
→ browser product pass
→ independent studio pass
→ hard gates + craft score
```

The design intentionally avoids agent swarms and giant skill packs. Extra orchestration is added only where it solves a demonstrated failure mode.

See [`docs/HARNESS.md`](docs/HARNESS.md) for the operating playbook and [`docs/GIT_POLICY.md`](docs/GIT_POLICY.md) for fixed-branch PR delivery and the owner-only integration boundary.

Contribution and private vulnerability-reporting expectations live in [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`SECURITY.md`](SECURITY.md).

## Install

Use Node.js 22.19.0 or newer, matching the reviewed Pi package requirement.

Install Pi:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@1.0.0
```

Validate the template:

```bash
bash scripts/pi-doctor.sh
```

Start Pi:

```bash
./p
```

`./p` treats this checked-out repository as trusted with Pi's official `--approve` flag, enables the full writable workspace, and uses `PI_GUARD_MODE=autonomous`, so normal implementation does not stall on approval loops. Use `PI_PROJECT_TRUST=ask ./p` to restore Pi's prompt or `PI_PROJECT_TRUST=never ./p` to ignore project resources for a diagnostic run.

The reviewed Pi `1.0.0` uses native MCP and capability-aware tool schemas. The launcher no longer forces experimental UI/setup features. `PI_SMART_READ=0 ./p` disables the harness's implicit large-file focusing for diagnosis. Pi's new fullscreen TUI is the upstream default; use `./p --tui-mode regular` when terminal scrollback matters.

In autonomous mode the agent may inspect, edit, install local dependencies, run tests, research, and perform browser QA within the available operating-system permissions. For user-requested implementation, the agent prepares the fixed `ai-changes` branch—creating it from `main` if absent—and automatically commits/pushes the verified scoped change into a new or updated related PR to `main`. It uses `node scripts/ai-pr.mjs`, not arbitrary pre-approved Git commands. No per-task branches, main writes, or auto-merge. Read-only/local-only work and evals never publish; set `AI_PR_DELIVERY=off` to opt out. The helper requires authenticated `gh` and ordinary Git push credentials; see `docs/GIT_POLICY.md` for setup and recovery.

Complete the one-time tool setup in [`docs/TOOLING_SETUP.md`](docs/TOOLING_SETUP.md).

Authenticate:

```text
/login
```

Select a model:

```text
/model
```

That selects the active model for the session. The template intentionally does not pin a provider, model, or thinking level, so it works with any Pi-supported model and respects the user's selection. For a one-off launch override:

```bash
PI_MAIN_MODEL="provider/model-id" PI_MAIN_THINKING="high" ./p
```

Do not commit API keys or personal model preferences to `.pi/models.env`.

Add a custom API-compatible provider without editing project files:

```bash
./p --add-provider
```

Enter the provider's API type, base URL, exact model ID, and capabilities. The wizard adds the model to your personal Pi `models.json` and stores a supplied key in `auth.json` with private permissions; it never writes credentials into this repository. Reopen `/model` to select it. This supports Pi's OpenAI Completions, OpenAI Responses, Anthropic Messages, and Google Generative AI protocols. An API that uses a different protocol or custom authentication headers needs a Pi extension or manual configuration.

## Daily usage

Start:

```bash
./p
```

For an ordinary task, a natural prompt is enough:

```text
Implement this behavior completely and verify it.
```

Reusable workflows:

```text
/discover <idea or problem>
/design <surface or journey>
/spec <accepted outcome>
/build <accepted task>
/test <behavior, defect, or risk>
/build-ui <accepted UI slice>
/design-review [route, flow, or diff]
/plan <complex goal>
/adr <architecture decision>
/review [scope or acceptance contract]
/release-plan [milestone]
/ship [scope or execution plan]
/incident <symptom or incident>
/handoff <active execution plan or task>
/resume <docs/exec-plans/active/...md>
/bootstrap [project constraints]
```

## Idea-to-product path

| Stage | Command / artifact | Exit evidence |
|---|---|---|
| Discovery | `/discover` → `docs/PRODUCT.md`, `docs/PLAN.md` | Target user/problem, riskiest assumption, measurable MVP outcome |
| Experience direction | `/design` → `docs/DESIGN.md` | Product-specific thesis, signature, tokens, states, responsive/browser proof plan |
| Feature contract | `/spec` or `/plan` | 3–7 observable criteria with proof and explicit non-goals |
| Walking skeleton | `/build` | One real end-to-end path, canonical start/test interfaces, observability |
| Visual MVP slice | `/build-ui` | Functional journey, required states, desktop/mobile evidence, hard gates and craft bar |
| Alpha / beta | `/release-plan` | Controlled cohort, telemetry, support/recovery, field quality and rollback triggers |
| Release candidate | `/review` then `/ship` | Every criterion proven; no unresolved BLOCKER/MAJOR; recovery/rollback ready |
| Production learning | `/incident` plus eval/regression updates | Outcomes and failures become product decisions, tests, or harness eval cases |

Reload project resources:

```text
/reload
```

## Task routing

The harness distinguishes four levels:

- **Localized:** `/skill:quick-fix <small low-risk change>` → direct inspect → change → targeted check; no plan, todo, subagent, or broad gate.
- **Standard:** compact acceptance contract, one vertical slice, verification, independent evaluation where useful.
- **Complex:** `/plan` plus a durable execution plan when work must survive context/session boundaries.
- **High risk:** explicit acceptance, risk/security review, negative-path evidence, and full verification before completion.

For Standard or larger work, the acceptance contract contains 3–7 observable criteria and proof required for each. This same contract drives implementation, review, browser QA, and the final report.

## Conditional independent evaluation

The main agent remains the only writer.

It may use a specialist only when the expected evidence is worth the extra model call:

- `scout` when the relevant repository surface or cross-module flow is genuinely unclear;
- `reviewer` after non-trivial user-facing work, cross-module changes, production-bug fixes, or material regression-risk changes;
- `security-auditor` after trust-boundary, money, access, migration, secret, upload, callback, deployment, or data-integrity changes.

Independent evaluation is bounded: by default, no more than two evaluator/repair rounds before the agent must reassess the root cause/contract or report a real blocker.

Configure subagent models with:

```text
/sub-agent-settings
```

Optional role posture (capabilities matter more than vendor/model names):

- Scout: fast model with strong repository/tool use
- Reviewer: model capable of independent code reasoning
- Security auditor: model capable of adversarial trust-boundary analysis
- Parent implementation session: best available coding model for the task's risk and budget

## Production tool stack

The template pins:

```text
pi-sub-agent
@juicesharp/rpiv-todo
pi-lsp-adapter
@dreki-gg/pi-doc-search
@bytetrue/pi-web-search
```

The launcher initially exposes only:

```text
read, bash, edit, write, grep, find, ls, harness_tools, tool_search
```

`harness_tools` activates every specialist group needed for the current task in one call:

| Capability | Deferred tools |
|---|---|
| `planning` | `todo` |
| `delegation` | `subagent` |
| `code_intelligence` | five focused LSP tools |
| `docs` | Context7 resolve + documentation lookup |
| `web` | `web_search`, `web_fetch` |

An empty capability list unloads managed specialists and preserves unrelated custom tools. Browser work uses native `tool_search` directly: load only the needed `mcp__playwright__*` tools, then call their returned schemas. No browser capability-loader call or third-party MCP adapter is needed. MCP connects in the background without blocking the first prompt on browser startup; this is not a lazy/idle-stop lifecycle. Native codemode remains an optional operator choice, not another default schema.

Useful checks:

```text
/todos
/lsp status
/mcp
/web --show
```

See [`docs/TOOLING_SETUP.md`](docs/TOOLING_SETUP.md) for LSP, documentation search, web search, and Playwright setup.

## Context and long-running work

`AGENTS.md` is a map, not an encyclopedia. `scripts/pi-doctor.sh` enforces an always-loaded size budget so detailed guidance must live in docs/skills instead of silently consuming task context.

The runtime records only bounded mechanical state—specialist groups, repository-relative modified paths, historical process observations (not acceptance verdicts), hashed failed-call signatures, and Smart Read count. It never stores raw tool arguments or result bodies. That capsule is restored from the active session branch and injected once after resume, tree navigation or compaction and complements, rather than replaces, Pi's built-in summary and the human-readable execution plan.

For complex work, use `docs/exec-plans/active/`. The plan stores accepted criteria, verified state, decisions, evidence, risks, and the next action—not raw transcripts.

When old context becomes noisy or the task must cross sessions:

```text
/handoff docs/exec-plans/active/my-task.md
```

Start a fresh session, then:

```text
/resume docs/exec-plans/active/my-task.md
```

The fresh agent validates the plan against the working tree before continuing.

## Failure recovery

The agent must not repeat the same failed approach indefinitely. After the same approach/check fails twice without materially new evidence, it should:

- preserve the exact failure;
- state competing root-cause hypotheses;
- gather the cheapest discriminating evidence;
- use semantic/local evidence before broad external research;
- use one focused independent investigation if needed;
- hand off to a fresh context when stale history is becoming harmful.

The runtime enforces the narrow mechanical part of this rule: after two errored executions with the same tool and canonical arguments, the third identical call is blocked until a different successful evidence/action step occurs. Only a 12-character hash and attempt count are persisted; the failed input is not.

Recurring failure classes should become tests, types/schemas, lint/structural checks, clearer APIs/tools, or focused docs—not more generic prompt text.

## Safety model

The normal launcher is intentionally **not sandboxed**. Pi runs directly with the operating-system permissions of the account that starts it, and the agent is expected to finish reversible work without permission popups.

`.pi/extensions/safety-guard.js` intercepts direct tool paths and common shell/MCP patterns for:

- sensitive credential and private-key paths;
- destructive recursive deletion;
- privilege escalation and host service mutation;
- arbitrary Git/GitHub mutation by default, while allowing the reviewed `scripts/ai-pr.mjs` capability and read-only inspection such as `status`, `diff`, `log`, and `gh ... view/list/checks`;
- global package installation and publishing;
- remote shell, deployment, infrastructure, and production database commands;
- secret-bearing or protected paths even when the rest of the workspace is writable;
- browser file upload/drop and MCP scripting.

Separately, `.pi/extensions/harness-runtime.js` manages dynamic tool activation, Smart Read, identical-call retry bounds, and continuity state. It does not weaken or bypass the safety guard.

Autonomous mode deliberately allows harness-policy edits, generated artifacts, full-workspace writes, public HTTP(S) navigation, and focused `browser_evaluate`. Raw Git mutation stays deny-by-default; only the fixed-branch PR helper has standing delivery scope. Strict/sandbox and local-only runs disable that helper as well. This is an accident-reduction layer, not a complete shell/interpreter parser or security boundary.

To diagnose without project trust or to opt into the older locks:

```bash
PI_PROJECT_TRUST=never ./p
PI_GUARD_MODE=strict ./p
```

The Docker boundary is optional and reserved for an untrusted repository, sensitive credentials/data, or genuinely unattended execution—not normal project work:

```bash
bash scripts/pi-sandbox.sh
```

The wrapper enables strict guard mode, does not mount host Pi state, SSH/cloud credentials, or the Docker socket, and passes only recognized provider/search keys. The repository remains a read/write bind mount. See [`SECURITY.md`](SECURITY.md) and Pi's [official security guidance](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md) for the exact trust/isolation distinction.

## Set the product design once

Tell Pi your preferences in ordinary language at the start, or use the existing `/design` prompt:

```text
/design Record this direction: calm, minimal Persian RTL interface. Light theme,
canvas #F8FAFC, primary text #0F172A, primary action #166534 with white text.
Use Vazirmatn with a suitable fallback, restrained rounding, no gradients.
Save these preferences only; do not build the UI yet.
```

Pi records explicit choices separately from proposed details in `docs/DESIGN.md`: style, colors and roles, themes, typography, constraints, and any liked/disliked examples with reasons. You do not have to fill the template or supply references. An approximate color name is a proposed exact shade, not an approved hex value. Later `/build-ui`, design review, and bootstrap reuse the recorded contract; a new session reads the file instead of relying on chat memory.

On implementation, map roles to the project's existing CSS variables/theme/native tokens and record that source path. Code owns resolved token values; the document owns intent and mappings. Changes update both, preserving unrelated choices. Requested brand colors remain explicit; contrast is measured on the actual foreground/background/state pairs and inaccessible uses are explained, not silently replaced. These are product preferences, separate from Pi's terminal theme. Saving instructions does not prove a model followed them: inspect the resulting UI and token mapping.

## Terminal appearance and run metrics

The project selects **slate**, a quiet dark theme with teal/blue accents, readable tool output, and distinct error/diff colors. Pi discovers `.pi/themes/slate.json`; no theme package or font is required. Try `./p --use-theme light` for a light terminal, or use `/settings` during a session. For a persistent project choice, change `theme` in `.pi/settings.json` (project settings override global settings at startup).

The normal Pi footer remains intact. A small status entry shows, for example:

```text
Run 18.4s (running) | 42.7 tok/s | Tools 4.2s | Retry 1 | ~$0.0123
```

- **Run:** wall time from agent start until Pi settles, including tools, automatic retries, retry waits, and automatic compaction. The final duration remains visible; the next run resets it. Queued follow-ups/steering processed before settling belong to the same busy run, not separate per-prompt measurements.
- **Model:** total provider-reported output tokens divided by the summed time from each turn's start to its finalized assistant response. This is an effective response rate including request/context preparation, first-token wait, and reasoning; it excludes intervening tool execution and retry backoff. It is not pure decode speed or a cross-provider benchmark. Provider accounting determines whether reasoning/tool-call tokens are included; input/cache tokens and delegated subagent usage are excluded. If the model changes mid-run, the value aggregates those responses.
- **Tools:** observed wall time with at least one foreground tool executing. Concurrent tool intervals count once; an in-flight tool counts until settling/cancellation. It excludes tool work not exposed by Pi's lifecycle events.
- **Retry:** observed new model turns following an assistant error in the same run. Ordinary tool turns, repeated commands, and failed responses with no subsequent attempt are not counted. Pi 1.0.0's extension API does not expose internal HTTP retries; this is not a provider retry count or an inferred count of repair rounds.
- **~$:** sum of Pi's positive, internally consistent USD usage-cost estimates for foreground assistant responses, including reported input/output/cache costs. It is based on configured pricing, not an invoice. Missing usage, zero/default prices, or inconsistent costs make the whole run `cost n/a`; a later successful response cannot hide a gap. Known free use and unknown all-zero pricing are intentionally not distinguished. Compaction, delegated agents, optional codemode model/image calls, external tools, subscriptions/credits, taxes, and provider-side charges not present in these messages are outside this estimate. Values below $0.0001 display as a positive amount, not $0.0000.
- Speed updates on finalized responses, not estimated character counts during streaming. Before usable usage arrives, or if any response lacks a valid positive count/timing, it shows `n/a`. `finished` means Pi is idle, not that verification passed; terminal error/abort responses are labeled separately.

The local `run-metrics.js` extension adds no tool schemas, model requests, transcript storage, or background work in print mode. It updates the status once per second while running and clears its timer on settle, session navigation, or shutdown. RPC clients receive status UI messages if they support them.

## Clear writing

Use the on-demand Pi skill for product copy, documentation, or an existing draft:

```text
/skill:no-ai-slop Edit the landing-page copy while preserving the product facts and voice.
/skill:no-ai-slop Detect formulaic patterns in this draft without rewriting: ...
```

This is a compact, MIT-attributed adaptation of [Peter Yang's no-ai-slop](https://github.com/petergyang/no-ai-slop). It preserves voice and facts, removes formulaic filler, supports Persian/English prose, and protects code, exact technical terms, and required report formats. It does not claim to detect AI authorship. No global installer, external service, or mandatory extra editing pass is introduced.

The former generic `risk-review` skill is consolidated into [Quality: focused risk review](docs/QUALITY.md#focused-risk-review); `/review` and `/incident` use that procedure. The other five existing skills retain distinct jobs: tiny fixes, check selection, test design, browser evidence, and visual design.

## Harness evaluation

Validate the starter benchmark without making model calls:

```bash
node scripts/run-workflow-evals.mjs --dry-run
```

The v2 runner grades completion, mutation scope, protected paths, no-publication eval scope, executable post-checks, and trace efficiency; qualitative rubrics remain explicitly unscored. The default single trial is a cheap smoke/regression signal. For a promotion decision, explicitly run repeated isolated trials with identical model/thinking settings for baseline and candidate and pass the first `summary.json` through `--baseline`. Model calls can incur cost and transmit repository content to the selected provider. See [`docs/EVALUATION.md`](docs/EVALUATION.md).

## Verification

The `verification-routing` skill chooses the cheapest reliable lane.

For an obvious low-risk edit, force the shorter Pi-native path directly:

```text
/skill:quick-fix <small low-risk change>
```

During implementation:

- exact affected test;
- a reviewed affected-file plan;
- changed/dependency-related tests;
- fast verification;
- one affected browser spec where relevant.

Inspect and execute the deterministic route map:

```bash
node scripts/verify-affected.mjs --file src/path/to/change.ts --plan
node scripts/verify-affected.mjs --file src/path/to/change.ts
```

`.pi/verification.json` stores argv-array commands. Matching routes are unioned and deduplicated; any unmatched file invokes the canonical full fallback instead of being silently skipped. `/bootstrap` must replace template routes with real project dependency evidence.

After a bounded slice:

- feature verification once.

Before final delivery or after High-risk changes:

- full verification once.

Generic full entrypoint:

```bash
bash scripts/verify.sh
```

A real project can provide `scripts/project-verify.sh` to replace the generic detector with its canonical gate. Use `/test` plus `test-design` when deciding whether behavior needs regression coverage: the Test Value Gate may add the smallest sensitive test, extend existing evidence, or intentionally add no test when the behavior is already proved.

## Browser and visual QA

Browser work has two layers:

- Playwright MCP for interactive exploration, accessibility snapshots, console/network inspection, and focused actions;
- repository-local Playwright Test for deterministic regression coverage and CI.

Local development policy:

- no `CI=1`;
- one relevant browser project;
- one worker;
- zero retries;
- video/trace/automatic screenshots off;
- reuse servers;
- run a specific spec.

For a material visual change, the product pass proves journey, states, accessibility, responsiveness, console/network health, and budgets. The studio pass actually inspects reference/baseline and current desktop/mobile images, uses focused crops for detail, and re-captures affected states after repairs. Playwright returns native screenshot images to the active model; no separate image provider or tool schema is added. Runtime capability/image-count diagnostics are not proof of inspection. Disabled, unavailable, or unreadable image input leaves appearance-only criteria `UNPROVEN`. See `browser-qa` for the bounded pixel-inspection loop and [`docs/TOOLING_SETUP.md`](docs/TOOLING_SETUP.md#visual-evidence-across-model-capabilities) for image privacy, configuration, and restart requirements.

## Repository layout

```text
.
├── AGENTS.md
├── p
├── .pi/
│   ├── mcp.json
│   ├── APPEND_SYSTEM.md
│   ├── models.env
│   ├── settings.json
│   ├── verification.json
│   ├── extensions/
│   │   ├── harness-runtime.js
│   │   ├── safety-guard.js
│   │   └── run-metrics.js
│   ├── themes/slate.json
│   ├── prompts/
│   │   ├── discover.md / design.md / spec.md / adr.md
│   │   ├── build.md / build-ui.md / design-review.md
│   │   └── test.md / plan.md / release-plan.md / review.md / ship.md / incident.md / handoff.md / resume.md
│   └── skills/
│       ├── browser-qa/
│       ├── frontend-design/
│       ├── quick-fix/
│       ├── no-ai-slop/
│       ├── test-design/
│       └── verification-routing/
├── docs/
│   ├── PRODUCT.md / DESIGN.md / ARCHITECTURE.md / PLAN.md
│   ├── HARNESS.md
│   ├── GIT_POLICY.md
│   ├── RESEARCH.md
│   ├── QUALITY.md
│   ├── TOOLING_SETUP.md
│   └── exec-plans/
│       └── README.md
├── scripts/
└── .github/workflows/quality.yml
```

## New-project workflow

1. Create a repository from this template.
2. Add/import the real product source.
3. Review the template once when adopting it, then run `./p`; the launcher trusts this checked-out project automatically.
4. Complete `docs/TOOLING_SETUP.md` once for the machine/project.
5. Run `/bootstrap` to make product, architecture, design, quality, verification, and runtime interfaces project-specific.
6. Use `/discover` for an unproven idea; use `/design` before visually significant implementation.
7. Use `/skill:quick-fix` for tiny low-risk edits, `/build` for ordinary slices, and `/build-ui` for flagship/frontend slices.
8. Use `/plan` only for work that genuinely needs durable design/execution state.
9. Use `/design-review` and `/review` for independent visual/product/risk evaluation.
10. Use `/handoff` + `/resume` for long-running work across clean contexts.
11. Use `/release-plan` for staged rollout and `/ship` for final acceptance plus scoped automatic PR handoff. The owner retains PR merge and release/deployment authority.

## Updating Pi and packages

For this release, install the reviewed runtime and restart Pi:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent@1.0.0
bash scripts/pi-doctor.sh
./p
```

Bring the workflow over as a coherent set. Replace the former template `.mcp.json` with `.pi/mcp.json`, remove the project `pi-mcp-adapter` package entry, and preserve any custom servers by converting their client-specific options using [Pi's MCP guide](https://github.com/earendil-works/pi/blob/v1.0.0/packages/coding-agent/docs/mcp.md). A user-level adapter also replaces native MCP: remove that installation in `pi config` if present. Do not overwrite product contracts or private provider settings. `/bootstrap` refreshes product context; it does not repair mismatched harness files.

Project package versions are exact pins in `.pi/settings.json`. Updating a pin requires source review and a disposable runtime check; `pi update <source>` does not make a versioned spec float. The reviewed registry integrities live in `.pi/package-integrity.json`:

```bash
node scripts/verify-package-integrity.mjs --online
```

## Research basis

[`docs/RESEARCH.md`](docs/RESEARCH.md) maps primary evidence from OpenAI, Anthropic, Princeton, UIUC, Microsoft Research, Meta, UMass, Stanford/Berkeley, Google, and regression-test-selection research to each workflow control and its limitations. The visual workflow additionally maps primary guidance from [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Google Web Vitals](https://web.dev/articles/vitals), [Material Design foundations/tokens](https://m3.material.io/styles), and Anthropic's [frontend-design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) into executable gates.

## License

No license has been selected yet. The repository owner must choose and add one before presenting the template as reusable; this legal/product decision is intentionally not guessed by the workflow.
