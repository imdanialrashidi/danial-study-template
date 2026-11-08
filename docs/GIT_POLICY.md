# Delivery Policy (opt-in team delivery)

## Default: solo, no publication

The default is solo work: implement, verify, and leave the proven change in the
working tree. No commit, push, branch, or PR unless the current request
explicitly asks for team delivery ("open a PR", "commit this", "deliver via
ai-changes", or equivalent). Review/explanation/plan-only work, "local only",
"do not commit", and "do not push" never trigger publication.

## Scope when delivery is requested

When the request asks for delivery, completing the task includes a scoped
commit, push, and pull request. Do not ask for a second authorization for that
routine handoff. The request can narrow this policy.

- Use the established `ai-changes` lane when it exists; target `main` in the
  same repository through `origin`.
- Do not create per-task branches unless the owner asks. Do not fork, delete a
  branch, or write to `main`.
- Only one task and writer owns the lane at a time. Continue a related open PR
  by its exact number; if it contains unrelated work, wait or ask the owner to
  combine the scopes.
- Never switch away from a dirty user worktree, discard staged changes, stash
  user work, or publish unknown local commits.

## Routine sequence

1. Inspect `git status --short`, the exact repository/remote, and open PRs
   (`gh pr list`). Read-only requests end without Git writes.
2. Fetch `origin` and confirm the base. If `ai-changes` is absent and the owner
   asked for that lane, create it from the freshly fetched `origin/main`:
   `git fetch origin main && git switch -c ai-changes --track origin/main`.
   If the branch already exists, switch to it. If the local branch diverges
   from the remote or contains unpublished work, stop and ask; never reset or
   force.
3. Implement and verify with the cheapest faithful checks. PR delivery alone
   does not require a plan, subagent, or full suite.
4. Review the complete diff. Stage only this task's files; preserve unrelated
   staged and unstaged work. Do not publish a failing, unverified,
   secret-bearing, or unresolved BLOCKER/MAJOR change.
5. Put a sanitized outcome, exact checks/results, and remaining risks in
   `.artifacts/pr-evidence.md` (gitignored; do not commit it).
6. Commit the explicit paths, push the branch, and create or update the PR:

   ```sh
   git add -- <path>...
   git commit -m "fix: accepted outcome"
   git push origin HEAD:ai-changes
   gh pr create --base main --head ai-changes \
     --title "Accepted outcome" --body-file .artifacts/pr-evidence.md
   ```

   For a related existing PR, push to the same branch and use
   `gh pr edit <number>` when the title or body must change; do not create a
   duplicate.
7. Verify the remote SHA, PR URL, and CI status separately. A successful push
   is not proof that a PR exists or that CI passed. Do not merge, release,
   deploy, or publish.

## Prohibited shortcuts

- `git push --force`, `--force-with-lease`, history rewrites, `reset --hard`,
  `clean -fd`, `checkout -- .`, or discarding user work.
- `--no-verify`, bypassing hooks, or disabling CI checks.
- Writing to `main`, merging a PR, tagging a release, deploying, or publishing a
  package without exact owner authorization.
- Committing secrets, credentials, private artifacts, generated output, or
  unrelated changes.
- Extracting credentials, installing authentication silently, or discovering
  unrelated credentials.

## Recovery

If a precondition, authentication, or permission check fails, stop delivery and
report the blocker. Continue safe local implementation when possible and report
the delivery blocker separately.

If commit or push succeeded but PR creation failed, inspect local status, the
exact SHA, remote state, and any open PR before retrying. Preserve the commit;
do not amend or force. Resume only the same verified task and report what
remains.

## Enforcement and limits

The normal session does not pre-approve destructive Git/GitHub actions; they
need explicit authorization. Read-only Git/PR/CI inspection remains available.
The owner is the only party who can authorize a main write, merge, release,
deployment, or production mutation.

Delivery requires Node.js 22+ (for the project), Git, an authenticated GitHub
CLI (`gh`) for PR creation, and ordinary configured Git push credentials. Do not
extract credentials or silently install/configure authentication.
