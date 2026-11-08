# Educational Site Template

A reusable, static-first educational website system for Persian (RTL) courses,
built with **Astro + TypeScript + Tailwind CSS + MDX + React Islands**. One
strong engine → many course sites: a new course means editing configuration
and writing content, never rebuilding the UI.

## Start here

- **Course authoring:** [`README-COURSE.md`](README-COURSE.md) — quick start
  (`npm install`, `npm run dev`), creating a new course, and the content
  contract. This is the onboarding path for authors and agents.
- **Hosting:** [`DEPLOYMENT.md`](DEPLOYMENT.md) — how the static site is
  deployed.
- **Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md) — setup, change
  contract, and PR evidence.
- **Security:** [`SECURITY.md`](SECURITY.md) — private vulnerability
  reporting.

## Docs

| Doc | What it covers |
|---|---|
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Product thesis and scope |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Visual contract |
| [`docs/QUALITY.md`](docs/QUALITY.md) | Quality policy and gates |
| [`docs/CONTENT-CONTRACT.md`](docs/CONTENT-CONTRACT.md) | Content schemas and build rules |
| [`docs/AI-CONTENT-PROMPT.md`](docs/AI-CONTENT-PROMPT.md) | Canonical entry point for content work |
| [`docs/WORKFLOW.md`](docs/WORKFLOW.md) | Agent execution model and verification lanes |
| [`.dsh/skills/`](.dsh/skills/) | Project workflow skills |
| [`docs/GIT_POLICY.md`](docs/GIT_POLICY.md) | Branch, commit, and PR policy |

Agent entry point: [`AGENTS.md`](AGENTS.md) (map) with workflow skills under
[`.dsh/skills/`](.dsh/skills/) and detail in [`docs/WORKFLOW.md`](docs/WORKFLOW.md).

> Agent workflow: [DSH Workflow](https://github.com/imdanialrashidi/dsh-workflow),
> adapted for this repository. The six skills live in `.dsh/skills/` so the
> workflow travels with the checkout; install the upstream globally to reuse it
> across other projects. See [`CHANGELOG.md`](CHANGELOG.md) for history.

## License

No license has been selected yet. The repository owner must choose and add one before presenting the template as reusable; this legal/product decision is intentionally not guessed by the workflow.
