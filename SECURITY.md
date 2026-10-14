# Security Policy

## Reporting a vulnerability

Do not open a public issue containing an exploitable vulnerability, secret, private log, or user data. Use the repository's private **Security → Report a vulnerability** flow when available. If private reporting is unavailable, contact the repository owner through a private channel and share only the minimum reproduction needed.

Include the affected version/commit, impact, prerequisites, a minimal reproduction, and any known mitigation. Remove credentials and personal data from evidence.

## Execution boundary

omp is a local coding agent and runs with the operating-system permissions of the account that starts it. Review repository configuration under `.omp/` and local settings under `~/.omp/agent/config.yml` before trusting an unreviewed checkout. Real isolation must come from the operating system, container, VM, or network policy.

Raw shared/external actions remain unauthorized unless explicitly requested. Team delivery uses only the reviewed `scripts/omp-pr.mjs` helper for scoped commit/push/PR delivery on `ai-changes`. Main writes, PR merge, and other external actions need exact owner authorization. Read-only inspection remains available. Secrets and private data must stay out of code, logs, screenshots, prompts, traces, and artifacts.

For an untrusted repository, unreviewed instructions, or work exposed to meaningful credentials/private data:

1. Prefer an OS/container/VM boundary with only the required workspace and credentials.
2. Do not commit API keys or model preferences; keep them in global omp settings or environment variables.
3. Review diffs and outputs before copying or deploying them to a trusted/production environment.

## Third-party dependencies

This project's deployable dependencies are declared in `package.json` and `package-lock.json`. Run `npm ci` and `npm run ci` before releasing. Review dependency changes and their integrity before updating them.

## Supported versions

Security fixes are applied to the current `main` branch. The repository does not currently publish versioned releases; once releases begin, list supported release lines here.
