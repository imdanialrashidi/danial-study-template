/**
 * Base-path aware URL helpers.
 *
 * Astro prefixes emitted asset URLs with `base`, but **it does not rewrite
 * `<a href>` strings you write yourself**. On a project-site deployment
 * (GitHub Pages at `https://user.github.io/<repo>/`) an unprefixed `href="/lessons"`
 * silently points outside the site and 404s — the site builds green and is still
 * completely broken in production.
 *
 * Every internal link therefore goes through `withBase`.
 */

/** The configured base path, always either '' or '/segment' (no trailing slash). */
export const basePath: string = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/**
 * Prefix a site-absolute path with the deployment base.
 *
 *   withBase('/lessons')        // root deployment → '/lessons'
 *   withBase('/lessons')        // /physics2      → '/physics2/lessons'
 *   withBase('/')               // /physics2      → '/physics2/'
 *
 * External URLs, anchors, and query-only paths are returned untouched.
 */
export function withBase(path: string): string {
  if (!path) return basePath || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path; // http:, mailto:, tel:
  if (path.startsWith('//')) return path; // protocol-relative
  if (path.startsWith('#')) return path;
  if (path.startsWith('?')) return path;

  if (path === '/') return `${basePath}/`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

/** Join a base path with a route for non-root deployments. */
export function route(path: string): string {
  return withBase(path);
}
/**
 * Remove the deployment base from an incoming pathname.
 *
 * Used for "is this nav item active?" checks: `/physics2/lessons/x` must still
 * match the `/lessons` route, otherwise every nav item loses its active state
 * on a project-site deployment.
 */
export function stripBase(pathname: string): string {
  if (!basePath) return pathname;
  if (pathname === basePath) return '/';
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length);
  return pathname;
}
