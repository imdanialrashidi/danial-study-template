import katex from 'katex';

/**
 * Build-time math rendering.
 *
 * KaTeX is invoked on the server during the static build, so formulas ship as
 * plain HTML + CSS and cost **zero** client JavaScript. Shipping KaTeX's
 * runtime to the browser for interactive typesetting would violate the
 * static-first budget this product accepts.
 *
 * TeX comes from course content, which is author- or AI-generated, so it is
 * validated rather than trusted: unsafe escapes are disabled, errors throw, and
 * the MDX escaping trap below is detected explicitly.
 */

/*
 * ── Authoring contract for LaTeX in MDX ────────────────────────────────────
 *
 * MDX processes escape sequences in JSX attribute strings, and the Astro
 * compiler processes them again. So `latex="\frac{a}{b}"` silently loses its
 * backslash and renders as the literal text "fracab".
 *
 * The only correct form is the MDX **expression container**, which is parsed as
 * JavaScript exactly once:
 *
 *     <Formula latex={"\\frac{a}{b}"} />      ✅ renders a real fraction
 *     <Formula latex="\\frac{a}{b}" />         ❌ renders the text "fracab"
 *
 * `assertTeXIntact` below turns that silent failure into a build error.
 */

const RENDER_OPTIONS: katex.KatexOptions = {
  displayMode: false,
  // Errors must fail the build rather than produce a half-rendered formula.
  throwOnError: true,
  strict: 'warn',
  // Blocks \href, \url, \includegraphics, \html* and friends from injecting
  // arbitrary markup into the page.
  trust: false,
  output: 'html',
  macros: {
    '\\RR': '\\mathbb{R}',
    '\\NN': '\\mathbb{N}',
    '\\ZZ': '\\mathbb{Z}',
    '\\QQ': '\\mathbb{Q}',
    '\\CC': '\\mathbb{C}',
    '\\dd': '\\,\\mathrm{d}',
  },
};

/**
 * Structural TeX commands. These never appear in ordinary prose, so finding one
 * without a leading backslash means an escaping step ate the backslash.
 */
const STRUCTURAL_COMMANDS = [
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

/** Remove `\text{...}` / `\operatorname{...}` groups so their words are not scanned. */
function stripTextGroups(tex: string): string {
  return tex.replace(/\\(?:text|mathrm|operatorname|textbf|textit|mbox)\s*\{[^{}]*\}/g, ' ');
}

/**
 * Throw when the TeX source looks like it lost backslashes to MDX/Astro
 * escape processing, and name the correct authoring form.
 */
export function assertTeXIntact(tex: string, where: string): void {
  const scannable = stripTextGroups(tex);
  for (const command of STRUCTURAL_COMMANDS) {
    // A command that is not preceded by a backslash (and not part of a longer word).
    if (new RegExp(`(^|[^\\\\a-zA-Z])${command}(?![a-zA-Z])`).test(scannable)) {
      throw new Error(
        `${where}: the LaTeX command "${command}" has no backslash. ` +
          `MDX and the Astro compiler each strip one level of escaping in plain JSX ` +
          `attributes, so "latex="${command}..." becomes "${command}...". ` +
          `Use the MDX expression container instead: ` +
          `latex={"\\\\${command}{...}"} — written in the .mdx file as latex={"\\\\\\\\${command}{...}"}.`,
      );
    }
  }
}

/**
 * Render inline math. Plain prose without TeX is passed through HTML-escaped so
 * authors can write "سازندهٔ f" without triggering a KaTeX parse error.
 */
export function renderInlineMath(tex: string, where = 'inline math'): string {
  const trimmed = tex.trim();
  if (!trimmed) return '';
  if (!containsTeX(trimmed)) return escapeBasic(trimmed);
  assertTeXIntact(trimmed, where);
  try {
    return katex.renderToString(trimmed, RENDER_OPTIONS);
  } catch (e) {
    throw new Error(`${where}: KaTeX could not render "${trimmed}". ${e instanceof Error ? e.message : e}`);
  }
}

/** Render block/display math. */
export function renderDisplayMath(tex: string, where = 'display math'): string {
  const trimmed = tex.trim();
  if (!trimmed) return '';
  assertTeXIntact(trimmed, where);
  try {
    return katex.renderToString(trimmed, { ...RENDER_OPTIONS, displayMode: true });
  } catch (e) {
    throw new Error(`${where}: KaTeX could not render "${trimmed}". ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * Decide whether a value should be typeset as mathematics or kept as text.
 *
 * The naive test (backslash, `$`, `^`, `_`) is too narrow: it rejects `f'(x)`
 * and `2x`, which authors write constantly, and then their primes and digits
 * render as plain text. It is too broad in the other direction as well —
 * running Persian prose through KaTeX would typeset it in serif italics.
 *
 * So: explicit TeX syntax always wins; Arabic-script text is never math;
 * everything else counts as math when it carries a mathematical signal.
 */
export function containsTeX(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  if (/\\[a-zA-Z]+/.test(trimmed) || /\$/.test(trimmed) || /[\^_{}]/.test(trimmed)) return true;

  // Arabic/Persian letters mean this is prose, not an expression.
  if (/[\u0600-\u06FF]/.test(trimmed)) return false;

  // Latin text counts as math only when it carries a digit, a group, or an
  // operator/prime — otherwise "plain text" would become italic maths.
  // `<` and `>` are deliberately excluded: they appear far more often in prose
  // comparisons than in formulas, and inequality TeX has `\\lt`, `\\leq` and
  // friends available when a typeset inequality is actually wanted.
  return /[0-9()+\-*/=.,']/.test(trimmed);
}

function escapeBasic(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}