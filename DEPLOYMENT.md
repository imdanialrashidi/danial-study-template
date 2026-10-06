# Deployment

The site is **static-first**: no server, no database, no runtime API. The build
produces a `dist/` directory that any static host can serve.

Nothing in this repository is provider-specific. The same source deploys to
GitHub Pages, Cloudflare Pages, Netlify, or an object store.

---

## How the base path works

Astro is configured with `base` and `site`:

```js
// astro.config.mjs
const basePath = (process.env.BASE_PATH ?? '').replace(/\/$/, '');
const site = process.env.SITE_URL ?? 'https://imdanialrashidi.github.io';
```

| Deployment | `BASE_PATH` | Resulting URL |
|---|---|---|
| Custom domain / root host | *(empty)* | `https://example.com/lessons` |
| GitHub Pages project site | `/physics2` | `https://user.github.io/physics2/lessons` |
| Sub-path on a shared host | `/courses/calculus` | `https://host/courses/calculus/lessons` |

Two things must carry the prefix:

1. **Assets** — Astro handles these automatically.
2. **Internal links** — Astro does **not** rewrite `<a href>` strings you write
   yourself. Every internal link therefore goes through `withBase()` in
   `src/lib/url.ts`.

> This is the most common way a project-site deployment breaks: the build
> succeeds, the homepage renders, and every navigation link 404s. Always build
> with `BASE_PATH` set and verify, as shown below.

---

## GitHub Pages

`.github/workflows/deploy.yml` builds and publishes on every push to `main`.

The workflow derives the base path from the repository name, so a repository
named `physics2` is served from `/physics2/`.

**First-time setup:**

1. Repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Optionally add a `DEPLOY_BASE` repository variable:
   - user/organisation site (`https://user.github.io`) → set `DEPLOY_BASE` to `/`
   - otherwise leave it unset and the repository name is used.
3. Optionally set `SITE_URL` to the canonical origin for correct `<link rel="canonical">`
   and sitemap URLs.

The workflow fails the build if content validation finds a problem, so a broken
course never reaches production.

---

## Cloudflare Pages

**Settings → Builds & deployments**

| Field | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` (set `NODE_VERSION=22`) |
| Environment variable `BASE_PATH` | leave **empty** for a root domain |
| Environment variable `SITE_URL` | `https://courses.example.com` |

For a course served under a sub-path, set `BASE_PATH` to that prefix (without a
trailing slash).

---

## Local verification of a deployment

Reproduce a project-site build and check it before publishing:

```bash
BASE_PATH=/physics2 SITE_URL=https://imdanialrashidi.github.io npm run build
BASE_PATH=/physics2 npm run validate:links
BASE_PATH=/physics2 npm run budgets

# Serve it the way a static host would, including the prefix.
npx serve dist        # then open http://localhost:3000/physics2/
```

`npm run validate:links` is base-path aware: it strips `BASE_PATH` before
resolving each link against the files in `dist/`.

---

## Adding a course site to a new repository

1. Create an empty repository named after the course, e.g. `physics2`.
2. Copy this template in (or use it as a starting point).
3. Edit `src/config/course.ts`.
4. Replace the content in `src/content/`.
5. Push to `main`. The deploy workflow publishes to
   `https://imdanialrashidi.github.io/physics2/`.

The creator identity (name, website, Telegram) stays identical across all
courses; only the course configuration and content change.