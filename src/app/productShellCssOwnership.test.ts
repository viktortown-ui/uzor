import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readCss = (path: string) => readFileSync(path, 'utf8');

describe('ProductShell CSS ownership', () => {
  const productShellCss = readCss('src/app/productShell.css');
  const wrappedCss = readCss('src/features/wrapped/wrapped.css');
  const deltaMapCss = readCss('src/features/deltaMap/deltaMap.css');

  it('keeps shared navigation and mobile shell selectors in productShell.css only', () => {
    for (const selector of [
      '.wrapped-brand',
      '.wrapped-pulse',
      '.wrapped-nav',
      '.product-sidebar',
      '.product-mobile-header',
      '.product-bottom-nav',
    ]) {
      expect(productShellCss, `${selector} should be owned by ProductShell`).toContain(selector);
    }

    for (const selector of [
      'wrapped-brand',
      'wrapped-pulse',
      'wrapped-nav',
      'product-sidebar',
      'product-mobile-header',
      'product-bottom-nav',
    ]) {
      expect(wrappedCss, `${selector} should not be redeclared by Wrapped`).not.toContain(selector);
    }
  });

  it('does not let deltaMap.css own the ProductShell desktop sidebar grid', () => {
    expect(deltaMapCss).not.toContain('grid-template-columns:260px 1fr');
    expect(deltaMapCss).not.toMatch(/\.delta-map-page\{[^}]*display\s*:\s*grid/);
    expect(deltaMapCss).not.toContain('.delta-map-page .wrapped-sidebar');
    expect(deltaMapCss).toMatch(/\.delta-map-page\{[^}]*overflow:hidden/);
  });

  it('keeps the tablet/mobile map width controlled by ProductShell below 900px', () => {
    expect(productShellCss).toMatch(/@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-shell\s*\{[\s\S]*?display:\s*block/);
    expect(productShellCss).toMatch(/@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-sidebar\s*\{[\s\S]*?display:\s*none/);
    expect(deltaMapCss).not.toMatch(/@media\s*\(max-width:\s*800px\)\s*\{[\s\S]*?\.delta-map-page\s*\{[\s\S]*?display:\s*block/);
  });

  it('does not add a second mobile bottom-nav safe-area allowance in Wrapped', () => {
    expect(productShellCss).toContain('padding-bottom: calc(84px + env(safe-area-inset-bottom));');
    expect(wrappedCss).not.toMatch(/wrapped-dashboard-mvp[\s\S]*?safe-area-inset-bottom/);
    expect(wrappedCss).not.toContain('calc(96px + env(safe-area-inset-bottom))');
    expect(wrappedCss).toContain('padding: 14px clamp(12px, 3.8vw, 18px) 20px;');
  });
});
