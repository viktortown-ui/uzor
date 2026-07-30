import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('product foundation visual contracts', () => {
  it('owns modern actions and 44px targets without native button chrome', () => {
    const css = readFileSync('src/styles/productPrimitives.css', 'utf8');
    for (const action of ['primary-action','secondary-action','text-action','danger-action']) expect(css).toContain(`.${action}`);
    expect(css).toContain('min-height:44px');
  });
  it('keeps desktop map chrome and utilities in normal-flow wrappers', () => {
    const chrome = readFileSync('src/features/deltaMap/DeltaMapChrome.tsx', 'utf8');
    const css = readFileSync('src/features/deltaMap/deltaMap.css', 'utf8');
    expect(chrome).toContain('delta-map-desktop-chrome');
    expect(chrome).toContain('delta-map-desktop-utilities');
    expect(css).toMatch(/\.delta-map-filters\s*\{\s*position:static/);
    expect(css).toMatch(/\.delta-map-desktop-utilities\{[^}]*flex-direction:column/);
  });
  it('exposes rendered-map readiness only after an idle event', () => {
    const source = readFileSync('src/features/deltaMap/DeltaMapCanvas.tsx', 'utf8');
    expect(source).toContain("map.once('idle', readyAfterIdle)");
    expect(source).toContain("data-map-render-state={mapError ? 'error' : mapReady ? 'ready' : 'loading'}");
    expect(source).toContain('https://tiles.openfreemap.org/styles/liberty');
  });
  it('uses a deterministic compact Settings label on narrow docks', () => {
    const css = readFileSync('src/app/productShell.css', 'utf8');
    expect(css).toContain('.mobile-app-dock__label--settings::after{content:"Настр."');
  });
});
