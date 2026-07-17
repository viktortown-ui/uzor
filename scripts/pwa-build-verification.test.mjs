import { describe, expect, it } from 'vitest';
import { deriveBuildContext, resolveInsideBase } from './pwa-build-verification.mjs';

function fixture(base) {
  return `<link rel="manifest" href="${base}manifest.webmanifest"><script src="${base}assets/app.js"></script>`;
}

describe('PWA build base verification', () => {
  it.each([
    ['root', '/', '/assets/app.js'],
    ['GitHub Pages', '/uzor/', '/uzor/assets/app.js'],
    ['configurable WebView', '/shell/app/', '/shell/app/assets/app.js'],
  ])('derives the %s base from generated HTML', (_label, base, asset) => {
    const context = deriveBuildContext(fixture(base));
    expect(context.baseUrl.pathname).toBe(base);
    expect(resolveInsideBase(asset, context.baseUrl, 'asset').relativePath).toBe('assets/app.js');
  });

  it('rejects assets outside a nested application base', () => {
    const { baseUrl } = deriveBuildContext(fixture('/uzor/'));
    expect(() => resolveInsideBase('/assets/app.js', baseUrl, 'asset')).toThrow('outside the application base');
  });
});
