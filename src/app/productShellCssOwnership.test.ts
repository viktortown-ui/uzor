import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readCss = (path: string) => readFileSync(path, 'utf8');

describe('ProductShell CSS ownership', () => {
  const productShellCss = readCss('src/app/productShell.css');
  const wrappedCss = readCss('src/features/wrapped/wrapped.css');
  const deltaMapCss = readCss('src/features/deltaMap/deltaMap.css');

  it('keeps shared navigation and mobile shell selectors in productShell.css only', () => {
    for (const selector of ['.wrapped-brand', '.wrapped-pulse', '.wrapped-nav', '.product-sidebar', '.mobile-app-shell', '.mobile-app-dock']) {
      expect(productShellCss, `${selector} should be owned by ProductShell`).toContain(selector);
    }
    for (const selector of ['wrapped-brand', 'wrapped-pulse', 'wrapped-nav', 'product-sidebar', 'mobile-app-dock']) {
      expect(wrappedCss, `${selector} should not be redeclared by Wrapped`).not.toContain(selector);
    }
  });

  it('does not let deltaMap.css own the ProductShell desktop sidebar grid', () => {
    expect(deltaMapCss).not.toContain('grid-template-columns:260px 1fr');
    expect(deltaMapCss).not.toMatch(/\.delta-map-page\{[^}]*display\s*:\s*grid/);
    expect(deltaMapCss).not.toContain('.delta-map-page .wrapped-sidebar');
    expect(deltaMapCss).toMatch(/\.delta-map-page\{[^}]*overflow:hidden/);
  });

  it('keeps mobile app shell structure owned by ProductShell without CSS-hiding desktop shell', () => {
    expect(productShellCss).toContain('.mobile-app-shell');
    expect(productShellCss).toContain('.mobile-app-main');
    expect(productShellCss).toContain('.mobile-app-dock');
    expect(productShellCss).not.toMatch(/@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.product-sidebar\s*\{[\s\S]*?display:\s*none/);
    expect(deltaMapCss).not.toMatch(/@media\s*\(max-width:\s*800px\)\s*\{[\s\S]*?\.delta-map-page\s*\{[\s\S]*?display:\s*block/);
  });

  it('keeps mobile protected navigation geometry owned only by ProductShell', () => {
    expect(productShellCss).toContain('--mobile-app-dock-height: 64px;');
    expect(productShellCss).toContain('--mobile-app-dock-overhang: 6px;');
    expect(productShellCss).toMatch(/--mobile-app-dock-space:\s*calc\(var\(--mobile-app-dock-height\) \+ var\(--mobile-app-dock-overhang\) \+ env\(safe-area-inset-bottom\)\);/);
    expect(productShellCss).toContain('--product-mobile-nav-space: var(--mobile-app-dock-space);');
    expect(productShellCss).toContain('padding-bottom: var(--mobile-app-dock-space);');
    expect(productShellCss).toContain('min-height: calc(100svh - var(--mobile-app-dock-space));');
    expect(productShellCss).toContain('min-height: calc(100dvh - var(--mobile-app-dock-space));');
    expect(productShellCss).toMatch(/\.mobile-app-dock\s*\{[\s\S]*?min-height:\s*calc\(var\(--mobile-app-dock-height\) \+ env\(safe-area-inset-bottom\)\)/);
    expect(productShellCss).toContain('translateY(calc(-1 * var(--mobile-app-dock-overhang)))');
    expect(wrappedCss).not.toMatch(/wrapped-dashboard-mvp[\s\S]*?safe-area-inset-bottom/);
    expect(wrappedCss).not.toContain('calc(96px + env(safe-area-inset-bottom))');
  });

  it('does not reserve the removed persistent mobile top header', () => {
    expect(productShellCss).not.toContain('padding-top: 56px;');
    expect(productShellCss).not.toContain('product-mobile-header');
  });
  it('declares hidden dock geometry on shell owner', () => {
    expect(productShellCss).toContain('.mobile-app-shell--dock-hidden {');
    expect(productShellCss).toContain('padding-bottom: 0;');
    expect(productShellCss).toContain('.mobile-app-shell--dock-hidden .mobile-app-main');
    expect(productShellCss).toContain('min-height: 100dvh;');
  });

});
