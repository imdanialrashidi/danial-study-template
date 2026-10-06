import { describe, it, expect } from 'vitest';
import { assertTeXIntact, renderDisplayMath, renderInlineMath, containsTeX } from '../../src/lib/math.ts';

/**
 * The MDX escaping trap is the single most damaging content bug in this
 * template: a formula written as `latex="\frac{a}{b}"` silently loses its
 * backslash and renders as the literal text "fracab". These tests pin both
 * halves of the contract — valid TeX renders, stripped TeX fails loudly.
 */

describe('assertTeXIntact', () => {
  it('accepts correctly backslashed commands', () => {
    expect(() => assertTeXIntact('\\frac{a}{b}', 'test')).not.toThrow();
    expect(() => assertTeXIntact("\\lim_{h \\to 0} \\frac{f(x+h)}{h}", 'test')).not.toThrow();
  });

  it('rejects a structural command that lost its backslash', () => {
    expect(() => assertTeXIntact('frac{a}{b}', 'test')).toThrow(/has no backslash/);
    expect(() => assertTeXIntact('f(x) = lim_{h to 0} frac{f(x+h)}{h}', 'test')).toThrow(
      /has no backslash/,
    );
  });

  it('does not flag the same words inside a \\text{} group', () => {
    expect(() => assertTeXIntact('\\text{partial fraction}', 'test')).not.toThrow();
    expect(() => assertTeXIntact('\\operatorname{frac}', 'test')).not.toThrow();
  });

  it('names the authoring form in the error so the fix is obvious', () => {
    expect(() => assertTeXIntact('sqrt(4)', 'test')).toThrow(/expression container/);
  });
});

describe('renderDisplayMath', () => {
  it('renders a real fraction element', () => {
    const html = renderDisplayMath('\\frac{a}{b}');
    expect(html).toContain('mfrac');
    expect(html).not.toContain('frac{a}');
  });

  it('renders the full derivative definition', () => {
    const html = renderDisplayMath("f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}");
    expect(html).toContain('mfrac');
    expect(html).toContain('mspace');
  });

  it('throws rather than emitting a broken plate for invalid TeX', () => {
    expect(() => renderDisplayMath('\\frac{unclosed')).toThrow();
  });

  it('neutralises unsafe escapes instead of emitting links or images', () => {
    // trust:false means \href, \url and \includegraphics render as inert text.
    // The contract is that they cannot introduce markup, not that they throw.
    for (const src of ['\\href{https://example.com}{x}', '\\url{https://example.com}', '\\includegraphics{a.png}']) {
      const html = renderDisplayMath(src);
      expect(html).not.toMatch(/<a\s/i);
      expect(html).not.toMatch(/<img/i);
    }
  });
});

describe('renderInlineMath', () => {
  it('renders inline TeX', () => {
    expect(renderInlineMath('f\'(x)')).toContain('katex');
  });

  it('passes plain Persian prose through without invoking KaTeX', () => {
    // Authors often write `latex="سرعت"`; that must not be a parse error.
    const html = renderInlineMath('سرعت');
    expect(html).toBe('سرعت');
    expect(html).not.toContain('katex');
  });

  it('passes markup-looking text through without emitting raw tags', () => {
    // Whether a payload takes the plain-text path or the KaTeX path, it must
    // never reach the page as live markup.
    for (const payload of ['<b>bold</b>', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>']) {
      const html = renderInlineMath(payload);
      expect(html).not.toMatch(/<script/i);
      expect(html).not.toMatch(/<img/i);
      expect(html).not.toMatch(/<b>/i);
    }
  });

  it('escapes plain text that is not markup at all', () => {
    expect(renderInlineMath('a & b')).toBe('a &amp; b');
  });
});

describe('containsTeX', () => {
  it('detects a backslash command', () => {
    expect(containsTeX('\\frac{a}{b}')).toBe(true);
  });

  it('detects a bare expression with a prime or a digit', () => {
    // Authors write these constantly; treating them as prose would render
    // primes as straight quotes and digits unstyled.
    expect(containsTeX("f'(x)")).toBe(true);
    expect(containsTeX('2x')).toBe(true);
    expect(containsTeX('x^2')).toBe(true);
  });

  it('leaves ordinary Persian prose alone', () => {
    expect(containsTeX('سرعت متوسط')).toBe(false);
    expect(containsTeX('سازندهٔ f')).toBe(false);
  });

  it('leaves ordinary English words alone', () => {
    expect(containsTeX('plain text')).toBe(false);
  });

  it('treats prose comparisons as text, not as failed mathematics', () => {
    expect(containsTeX('a < b and b > c')).toBe(false);
  });

  it('handles empty input', () => {
    expect(containsTeX('')).toBe(false);
    expect(containsTeX('   ')).toBe(false);
  });
});