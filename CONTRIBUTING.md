# Contributing

Contributions should improve representative task outcomes, reduce risk/cost, or make the workflow easier to operate. More prompt text or orchestration is not automatically an improvement.

## Setup

1. Use Node.js 22.19.0 or newer.
2. Install DeepSeek Harness (DSH), for example `npx @deepseek-ai/dsh web`.
3. Review [`AGENTS.md`](AGENTS.md), [`.dsh/skills/`](.dsh/skills/), and
   [`docs/WORKFLOW.md`](docs/WORKFLOW.md) before trusting the repository.
4. Install dependencies with `npm ci` (or `bash scripts/ci-install.sh`, which
   also handles pnpm/Yarn lockfiles and Python projects).
5. Run `bash scripts/verify.sh` before and after a workflow change.

## Change contract

For a non-trivial change, state:

- problem and accepted outcome;
- explicit non-goals;
- observable criteria and proof;
- compatibility, security, data, accessibility, performance, visual, and operational risk where relevant;
- rollback or targeted reversal.

Preserve unrelated work and keep one primary writer. Do not add dependencies without a concrete benefit over current/platform capabilities.

## Workflow-policy changes

Workflow maintenance is allowed in the default autonomous mode. Keep it explicitly scoped, update all affected source-of-truth documents — `AGENTS.md`, `docs/WORKFLOW.md`, `docs/QUALITY.md`, `docs/GIT_POLICY.md`, the matching `.dsh/skills` procedures, `scripts/verify.sh`, and `CHANGELOG.md` — and rely on the tested diff/CI evidence.

Run:

```bash
bash scripts/verify.sh
```

Do not publish workflow artifacts containing repository content or credentials.

## Frontend contributions

- Follow the accepted `docs/DESIGN.md`; update it before introducing a new visual direction.
- Prove the critical journey and required states with `npm run preview` and the project QA scripts.
- Include deterministic desktop/mobile/demanding-state evidence for a material visual change.
- Report the `docs/DESIGN.md` hard gates and craft score; aesthetics never cancel a functional/accessibility/performance failure.
- Record third-party font/media/icon source and license.

## Pull request evidence

Complete the pull-request template. Link exact commands and outcomes, not “tests pass.” Include screenshots only when they are deterministic, non-sensitive, and materially help review.

Report vulnerabilities privately using `SECURITY.md`, not a public issue or pull request.
