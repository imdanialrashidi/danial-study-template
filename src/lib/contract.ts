/**
 * Shared content-contract predicates — the single source for shapes asserted
 * in two places: Zod schemas (`src/content.config.ts`) and build-time math
 * guards (`src/lib/math.ts`).
 *
 * Pure, no imports, runs under vitest and Astro alike. The validator script
 * (`scripts/validate-content.mjs`) runs on bare Node 22, which cannot import
 * `.ts`, so it keeps a local mirror of the command list with a parity
 * comment — the list here is the source it mirrors.
 */

/**
 * Reference to a content entry, optionally with a `#fragment` target:
 * `chain-rule` or `chain-rule#chain-rule`. Same shape the Zod
 * `formulaRef`/`conceptRef` schemas pin.
 */
export const CONTENT_REF_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*(#[a-z0-9][a-z0-9-]*)?$/;

/**
 * Structural TeX commands. These never appear in ordinary prose, so finding
 * one without a leading backslash means an escaping step ate the backslash.
 */
export const STRUCTURAL_TEX_COMMANDS: readonly string[] = [
  'frac',
  'dfrac',
  'tfrac',
  'sqrt',
  'cdot',
  'times',
  'neq',
  'leq',
  'geq',
  'approx',
  'infty',
  'partial',
  'rightarrow',
  'Rightarrow',
  'nabla',
  'theta',
  'alpha',
  'beta',
  'gamma',
  'lambda',
  'sigma',
  'Omega',
];

/**
 * First structural command used without a backslash in already-extracted TeX
 * source, or `undefined` when the source is intact. Callers strip
 * `\text{…}`-style groups before calling so prose words inside them are not
 * scanned.
 */
export function findStrippedTeXCommand(scannable: string): string | undefined {
  for (const command of STRUCTURAL_TEX_COMMANDS) {
    // A command that is not preceded by a backslash (and not part of a longer word).
    if (new RegExp(`(^|[^\\\\a-zA-Z])${command}(?![a-zA-Z])`).test(scannable)) return command;
  }
  return undefined;
}

