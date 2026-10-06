/**
 * Course-specific islands go here.
 *
 * A course that needs its own interactivity adds a React component in this
 * directory, registers it in `src/islands/registry.ts`, and wraps it in a thin
 * Astro component under `src/components/educational/` carrying the `client:*`
 * directive (see `Quiz.astro` for the pattern). The core layout never imports
 * an island directly — the registry is the only coupling point.
 *
 * This file intentionally exports nothing; it keeps the directory (and its
 * purpose) visible in a fresh checkout.
 */
export {};
