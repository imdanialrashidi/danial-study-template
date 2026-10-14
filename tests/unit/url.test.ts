import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Base-prefix table for the deployment URL helpers.
 *
 * Why this file exists: on a project-site deployment (GitHub Pages under
 * `/<repo>/`) every hand-written `<a href>` that skips `withBase` points
 * outside the site and 404s — while the build stays green. These cases pin
 * the contract (untouched externals/anchors/queries, correct prefixing) at
 * the cheapest layer. The `stripBase`/`withBase` agreement case below is the
 * oracle that the output-test dedup (Step 3) must preserve.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadWithBaseUrl(baseUrl: string) {
  vi.stubEnv('BASE_URL', baseUrl);
  vi.resetModules();
  return import('../../src/lib/url.ts');
}

describe('withBase at root (BASE_URL=/)', () => {
  it('passes site-absolute paths through', async () => {
    const { withBase } = await loadWithBaseUrl('/');
    expect(withBase('/lessons')).toBe('/lessons');
    expect(withBase('/')).toBe('/');
  });

  it('maps empty input to the site root', async () => {
    const { withBase } = await loadWithBaseUrl('/');
    expect(withBase('')).toBe('/');
  });

  it('leaves external URLs, protocol-relative, anchors, and queries untouched', async () => {
    const { withBase } = await loadWithBaseUrl('/');
    expect(withBase('https://example.com/x')).toBe('https://example.com/x');
    expect(withBase('mailto:a@b.ir')).toBe('mailto:a@b.ir');
    expect(withBase('//cdn.example.com/x')).toBe('//cdn.example.com/x');
    expect(withBase('#anchor')).toBe('#anchor');
    expect(withBase('?q=1')).toBe('?q=1');
  });
});

describe('withBase under a project-site base (BASE_URL=/physics2/)', () => {
  it('prefixes site-absolute paths with the base', async () => {
    const { withBase } = await loadWithBaseUrl('/physics2/');
    expect(withBase('/lessons')).toBe('/physics2/lessons');
    expect(withBase('/')).toBe('/physics2/');
  });

  it('maps empty input to the base', async () => {
    const { withBase } = await loadWithBaseUrl('/physics2/');
    expect(withBase('')).toBe('/physics2');
  });

  it('still leaves externals, anchors, and queries untouched', async () => {
    const { withBase } = await loadWithBaseUrl('/physics2/');
    expect(withBase('https://example.com/x')).toBe('https://example.com/x');
    expect(withBase('#anchor')).toBe('#anchor');
    expect(withBase('?q=1')).toBe('?q=1');
    expect(withBase('//cdn.example.com/x')).toBe('//cdn.example.com/x');
  });
});

describe('stripBaseWith(base, href)', () => {
  it('is the identity at root', async () => {
    const { stripBaseWith } = await loadWithBaseUrl('/');
    expect(stripBaseWith('', '/lessons/x')).toBe('/lessons/x');
    expect(stripBaseWith('', '/')).toBe('/');
  });

  it('strips a /base prefix and maps the bare base to /', async () => {
    const { stripBaseWith } = await loadWithBaseUrl('/');
    expect(stripBaseWith('/physics2', '/physics2/lessons/x')).toBe('/lessons/x');
    expect(stripBaseWith('/physics2', '/physics2')).toBe('/');
  });

  it('leaves foreign paths untouched', async () => {
    const { stripBaseWith } = await loadWithBaseUrl('/');
    expect(stripBaseWith('/physics2', '/other/x')).toBe('/other/x');
    expect(stripBaseWith('/physics2', '/physics2x/y')).toBe('/physics2x/y');
  });

  it('agrees with withBase under /base: strip(with(x)) === x', async () => {
    const { withBase, stripBaseWith } = await loadWithBaseUrl('/physics2/');
    for (const path of ['/', '/lessons', '/lessons/x', '/search?q=1']) {
      expect(stripBaseWith('/physics2', withBase(path))).toBe(path);
    }
  });

  it('agrees with the runtime stripBase on a /base case', async () => {
    const { stripBase } = await loadWithBaseUrl('/physics2/');
    const { stripBaseWith } = await loadWithBaseUrl('/');
    expect(stripBase('/physics2/lessons/x')).toBe(stripBaseWith('/physics2', '/physics2/lessons/x'));
  });
});
