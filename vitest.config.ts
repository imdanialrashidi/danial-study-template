import { defineConfig } from 'vitest/config';

/**
 * Two suites, two layers:
 *
 * - `tests/unit/**`   — pure logic. No build required, runs first and fast.
 * - `tests/output/**` — asserts the *built* `dist/` tree. These checks are only
 *   meaningful against a fresh build, so they run after `astro build` and are
 *   invoked separately (`npm run test:dist`) rather than in the default lane.
 *
 * This split exists because running an output assertion against a stale or
 * absent `dist/` reports failures that say nothing about the code — the exact
 * confusion that briefly made a correct build look broken.
 *
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
  },
});