import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Palette contrast contract.
 *
 * `docs/DESIGN.md` promises WCAG 2.2 AA for every semantic text pair, and the
 * colour roles live in `src/styles/theme.css`. A palette edit is invisible to
 * the type checker, so this test reads the real token file and recomputes the
 * ratios: if a future tweak lightens `ink-faint` below 4.5:1 (it was 3.3:1
 * before 2026-11-01), the build fails here instead of shipping unreadable meta
 * text.
 *
 * Non-text roles (borders, hairlines) are intentionally not asserted: their
 * contract is 3:1 and they are decorative-first.
 */

const TOKEN_FILE = path.resolve(import.meta.dirname, '../../src/styles/theme.css');

type Channels = readonly [number, number, number];

function parseTokens(css: string): Record<string, Channels> {
  const tokens: Record<string, Channels> = {};
  for (const match of css.matchAll(/--rgb-([a-z-]+):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g)) {
    tokens[match[1]] = [Number(match[2]), Number(match[3]), Number(match[4])];
  }
  return tokens;
}

/** WCAG 2.2 relative luminance. */
function luminance([r, g, b]: Channels): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Channels, b: Channels): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

const css = readFileSync(TOKEN_FILE, 'utf8');
const darkStart = css.indexOf("[data-theme='dark']");
const overrideStart = css.indexOf('[data-course-accent]');

const lightTokens = parseTokens(css.slice(0, darkStart));
const darkTokens = parseTokens(css.slice(darkStart, overrideStart));

const TEXT_ROLES = ['ink', 'ink-muted', 'ink-faint'] as const;
const SURFACES = ['canvas', 'surface', 'surface-sunken'] as const;

describe.each([
  ['light', lightTokens],
  ['dark', darkTokens],
] as const)('%s theme text roles', (theme, tokens) => {
  it.each(TEXT_ROLES.flatMap((role) => SURFACES.map((surface) => [role, surface] as const)))(
    '%s on %s meets AA (4.5:1)',
    (role, surface) => {
      const foreground = tokens[role];
      const background = tokens[surface];
      expect(foreground, `--rgb-${role} missing in ${theme}`).toBeDefined();
      expect(background, `--rgb-${surface} missing in ${theme}`).toBeDefined();
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('keeps the ink → muted → faint hierarchy', () => {
    const ratios = TEXT_ROLES.map((role) => contrast(tokens[role], tokens.canvas));
    expect(ratios[0]).toBeGreaterThan(ratios[1]);
    expect(ratios[1]).toBeGreaterThan(ratios[2]);
  });
});

describe('interactive control borders', () => {
  it.each([
    ['light', lightTokens],
    ['dark', darkTokens],
  ] as const)('%s border-control meets 3:1 on every surface', (_theme, tokens) => {
    for (const surface of SURFACES) {
      expect(contrast(tokens['border-control'], tokens[surface])).toBeGreaterThanOrEqual(3);
    }
  });
});
