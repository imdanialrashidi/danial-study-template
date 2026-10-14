# Plan 017: Escape JSON-LD script breakouts and add hardening headers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e7278d8..HEAD -- src/layouts/BaseLayout.astro src/lib/utils.ts public/_headers src/layouts/ContentLayout.astro src/layouts/ListingLayout.astro`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `e7278d8`, 2026-10-14

## Why this matters

`JSON.stringify` does not neutralize `</script>` or `<!--`. Every JSON-LD
block serializes author-controlled strings (titles, descriptions — the Zod
schema permits `<`/`>`), so a script-closer in a title breaks out of the
`application/ld+json` block and runs as stored XSS in every visitor's browser.
Separately, the response carries zero hardening headers: no MIME-sniff
protection, full-URL referrer leaks (including `?q=` search terms) to
Telegram/GitHub destinations, and framable quiz UI.

## Current state

- Sink: `src/layouts/BaseLayout.astro:93-95` —
  `{jsonLd.map((node) => (<script type="application/ld+json"
  set:html={JSON.stringify(node)} />))}`.
- Sources (all author-controlled strings): `ContentLayout.astro:54-79`
  (`headline: entry.title`, `description`, breadcrumb `name`s);
  `ListingLayout.astro:36-48` (`name: title`, item `name`s);
  `index.astro:47-60` (course name/description); `map.astro:23-33`;
  `about.astro:11-25`; `glossary/index.astro:32-48`. All flow through
  `CourseLayout.astro:57` → `BaseLayout.astro:93-95` — fixing the sink (or one
  shared serializer used by it) covers every page.
- Precedent already in-repo: `src/lib/utils.ts:108-116` `jsonForScript`
  escapes `<` as `\u003c` (plus `>`, `&`, U+2028/29) for `application/json`
  script embedding. Reuse it — do not invent a second escaper.
- Headers: `public/_headers:1-15` sets only `Cache-Control` (`/_astro/*`
  immutable; four brand assets 1-day). Zero matches repo-wide for
  `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`.
- Deploy note: `_headers` is read by Cloudflare Pages and ignored by other
  hosts (comment at `_headers:1`); GitHub Pages ignores it — the JSON-LD fix
  is the portable mitigation, headers are defense-in-depth where honored.
- CSP is deliberately deferred: the page carries intentional inline
  theme-bootstrap scripts (`BaseLayout.astro:109-119`), so CSP needs hashes;
  ship the three non-CSP headers first.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Unit tests| `npm run test`           | all pass, incl. new test |
| Validate  | `npm run validate`       | `No content errors found.` |
| Lint      | `npm run lint`           | exit 0              |
| Build     | `npm run build`          | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `src/layouts/BaseLayout.astro` (use the shared serializer at the sink)
- `src/lib/utils.ts` ONLY if `jsonForScript` needs a JSON-LD-specific export
  (prefer reusing it directly; a one-line alias is the max)
- `tests/unit/utils.test.ts` (extend — or the closest existing utils test file)
- `public/_headers`

**Out of scope** (do NOT touch, even though they look related):
- Individual `*JsonLd` builders in pages/layouts — fixing the single sink
  covers them; touching six builders risks divergence.
- CSP headers or inline-script hashing — explicitly deferred, document why in
  the `_headers` comment.
- `src/components/educational/Formula.astro` KaTeX sinks — safe by
  construction, pinned by `tests/unit/math.test.ts` (rejected finding).

## Git workflow

- Branch: per operator instruction (fixed lane via `scripts/omp-pr.mjs`; do not invent per-task branches).
- Commit per step; short imperative messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Serialize JSON-LD through the shared escaper

In `BaseLayout.astro:93-95`, replace `JSON.stringify(node)` with the shared
`jsonForScript(node)` from `src/lib/utils.ts` (import it; verify its escaping
covers `</script>` — `<` → `\u003c` neutralizes both `</script>` and `<!--`).
No per-page changes.

**Verify**: `npm run typecheck` → exit 0; `npm run build` → exit 0, then
`grep -o '</script>' dist/index.html | head -1` sanity: page scripts intact
(the escaper only affects the JSON-LD payload bytes).

### Step 2: Add a unit test with a hostile title

Extend the utils tests: `jsonForScript({headline: 'x</script><script>alert(1)'})`
must contain no literal `</script>` and must round-trip through `JSON.parse`
to the original value. This pins both safety and validity (JSON-LD must still
parse).

**Verify**: `npm run test` → all pass including the new test. Red-proof:
temporarily revert Step 1 to raw `JSON.stringify` in a scratch copy of the
assertion and confirm it FAILS (then restore).

### Step 3: Add the three non-CSP hardening headers

Append to `public/_headers` a `/*` block:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
```

Keep the existing `Cache-Control` blocks untouched. Add a comment noting CSP
is deferred (inline theme scripts need hashes) and that GitHub Pages ignores
`_headers` (Cloudflare honors it).

**Verify**: `npm run build` → exit 0; `npm run validate:links` → exit 0
(headers don't affect links, but proves the build is intact).

## Test plan

- New `jsonForScript` hostile-title case (Step 2) — safety + round-trip.
- Existing nets unchanged: unit suite, validator, budgets stay green.
- Header change verified by file inspection + successful build (no runtime
  header assertion layer exists; note as reviewer-checked).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0, hostile-title JSON-LD test exists and passes
      with red proof performed
- [ ] `npm run validate`, `npm run lint`, `npm run build` all exit 0
- [ ] `grep -n "JSON.stringify(node)" src/layouts/BaseLayout.astro` returns no
      matches (shared serializer in use)
- [ ] `grep -n "X-Content-Type-Options\|Referrer-Policy\|X-Frame-Options" public/_headers`
      returns all three
- [ ] Built JSON-LD still parses (covered by the round-trip test)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts.
- `jsonForScript`'s escaping breaks JSON-LD parsing in the round-trip test
  (escaping assumption wrong — report the exact failure).
- Any page builds its `<script type="application/ld+json">` outside
  `BaseLayout.astro:93-95` (grep `ld+json` repo-wide; if a second sink
  exists, report rather than expanding scope silently).
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- Every future JSON-LD builder automatically inherits the fix via the sink —
  reviewers: reject any new `JSON.stringify` directly into `set:html`.
- When the inline theme scripts gain hashes, revisit CSP (documented deferral
  in the `_headers` comment).
- Credential rule: this plan touches no secrets; if you encounter any while
  working, reference `file:line` only, never copy values.
