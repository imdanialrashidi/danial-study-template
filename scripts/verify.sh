#!/usr/bin/env bash
# Canonical verification gate for this repository.
# Workflow self-checks first, then the cheapest project lane that applies.
set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail=0
note() { printf '%s\n' "$1"; }
bad() { printf 'FAIL: %s\n' "$1" >&2; fail=1; }

# 1. Whitespace errors in tracked changes.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git --no-pager diff --check || bad "git diff --check reported whitespace errors."
fi

# 2. Every DSH project skill needs valid frontmatter and a matching name.
for skill in .dsh/skills/*/SKILL.md; do
  [[ -f "$skill" ]] || continue
  dir="$(basename "$(dirname "$skill")")"
  first="$(sed -n '1p' "$skill")"
  if [[ "$first" != "---" ]]; then
    bad "$skill does not start with YAML frontmatter."
    continue
  fi
  close="$(awk 'NR > 1 && $0 == "---" { print NR; exit }' "$skill")"
  if [[ -z "$close" ]]; then
    bad "$skill has no closing frontmatter delimiter."
    continue
  fi
  front="$(sed -n "2,$((close - 1))p" "$skill")"
  name="$(printf '%s\n' "$front" | sed -n 's/^name:[[:space:]]*//p' | head -n 1)"
  name="${name%\"}"
  name="${name#\"}"
  description="$(printf '%s\n' "$front" | sed -n 's/^description:[[:space:]]*//p' | head -n 1)"
  [[ "$name" == "$dir" ]] || bad "$skill frontmatter name '$name' does not match directory '$dir'."
  [[ "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] || bad "$skill name is not kebab-case."
  [[ -n "$description" ]] || bad "$skill is missing frontmatter description."
  unknown="$(printf '%s\n' "$front" | sed -n 's/^\([A-Za-z][A-Za-z0-9_-]*\):.*/\1/p' | grep -v -x -E 'name|description|whenToUse|metadata|disable-model-invocation|user-invocable' || true)"
  [[ -z "$unknown" ]] || bad "$skill has unsupported frontmatter keys: $unknown"
  tail -n "+$((close + 1))" "$skill" | grep -q '[^[:space:]]' || bad "$skill has an empty instruction body."
done

for skill in quick-fix spec build verify review test-design; do
  [[ -f ".dsh/skills/$skill/SKILL.md" ]] || bad "missing DSH project skill: $skill"
done

# A skill file must be trackable; an ignored file would disappear on a fresh checkout.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  for skill in .dsh/skills/*/SKILL.md; do
    [[ -f "$skill" ]] || continue
    if git check-ignore -q "$skill"; then
      bad "$skill is ignored by .gitignore and would not be committed."
    fi
  done
fi

# 3. Retired omp artifacts must not return.
if [[ -e .omp || -e scripts/omp-pr.mjs ]]; then
  bad "retired omp workflow artifacts are present; use .dsh/skills and docs/GIT_POLICY.md."
fi

# 4. The workflow entry point and its owned documents must exist.
for required in AGENTS.md docs/WORKFLOW.md docs/QUALITY.md docs/GIT_POLICY.md; do
  [[ -f "$required" ]] || bad "missing workflow file: $required"
done

[[ "$fail" -eq 0 ]] || exit 1
note "Workflow self-checks passed."

# 5. Project override wins when the repo defines its own gate.
if [[ -x scripts/project-verify.sh ]]; then
  exec scripts/project-verify.sh
fi

ran=0

run_node_script() {
  local script="$1"
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$script'] ? 0 : 1)" >/dev/null 2>&1 || return 0
  ran=1
  if [[ -f pnpm-lock.yaml ]]; then pnpm run "$script"
  elif [[ -f yarn.lock ]]; then yarn "$script"
  else npm run "$script"
  fi
}

if [[ -f package.json ]]; then
  if node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts.ci ? 0 : 1)" >/dev/null 2>&1; then
    ran=1
    if [[ -f pnpm-lock.yaml ]]; then pnpm run ci
    elif [[ -f yarn.lock ]]; then yarn ci
    else npm run ci
    fi
  else
    run_node_script "format:check"
    run_node_script "typecheck"
    run_node_script "lint"
    run_node_script "test"
    run_node_script "build"
  fi
fi

if [[ -f pyproject.toml || -f requirements.txt ]]; then
  ran=1
  python -m compileall -q -x '(^|/)(\.venv|venv|build|dist|node_modules)/' .
  command -v ruff >/dev/null 2>&1 && ruff check .
  command -v mypy >/dev/null 2>&1 && mypy .
  command -v pytest >/dev/null 2>&1 && pytest
fi

if [[ -f go.mod ]]; then
  ran=1
  unformatted="$(gofmt -l .)"
  [[ -z "$unformatted" ]] || { printf 'Unformatted Go files:\n%s\n' "$unformatted" >&2; exit 1; }
  go vet ./...
  go test ./...
fi

if [[ -f Cargo.toml ]]; then
  ran=1
  cargo fmt --all -- --check
  cargo clippy --all-targets --all-features -- -D warnings
  cargo test --all-features
fi

if [[ "$ran" -eq 0 ]]; then
  if grep -Fxq -- '- Primary users:' docs/PRODUCT.md; then
    printf '\nTemplate-only verification passed. Fill docs/PRODUCT.md during the first spec.\n'
    exit 0
  fi
  cat >&2 <<'MSG'
No supported project or verification command was found.
Add normal package scripts (format:check/typecheck/lint/test/build or ci),
or create executable scripts/project-verify.sh for this repository.
MSG
  exit 1
fi
