import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const legacyCss = readFileSync('src/features/legacyCircle/legacyCircle.css', 'utf8');
const modernBaseCss = readFileSync('src/styles/modernBase.css', 'utf8');

function scopedSelectors(css: string) {
  const selectors: string[] = [];
  const visit = (source: string) => {
    let cursor = 0;
    while (cursor < source.length) {
      const open = source.indexOf('{', cursor);
      if (open < 0) break;
      const prelude = source.slice(cursor, open).trim();
      let depth = 1;
      let close = open + 1;
      while (close < source.length && depth) {
        if (source[close] === '{') depth += 1;
        else if (source[close] === '}') depth -= 1;
        close += 1;
      }
      if (depth) throw new Error(`Unbalanced CSS block: ${prelude}`);
      const body = source.slice(open + 1, close - 1);
      if (/^@(?:-\w+-)?keyframes\b/.test(prelude)) {
        // Keyframe step selectors are the only intentionally unscoped selectors.
      } else if (/^@media\b/.test(prelude)) {
        visit(body);
      } else if (prelude.startsWith('@')) {
        throw new Error(`Undocumented legacy at-rule: ${prelude}`);
      } else {
        selectors.push(...prelude.split(',').map((selector) => selector.trim()));
      }
      cursor = close;
    }
  };
  visit(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  return selectors;
}

describe('legacy CSS isolation', () => {
  it('scopes every legacy style rule beneath .legacy-shell', () => {
    const selectors = scopedSelectors(legacyCss);
    expect(selectors.length).toBeGreaterThan(30);
    for (const selector of selectors) {
      expect(selector, `unscoped legacy selector: ${selector}`).toMatch(/^\.legacy-shell(?:\b|[ >+~.#[:])/);
      expect(selector, `global universal selector: ${selector}`).not.toMatch(/^(?:\*|::?before|::?after)$/);
    }
    expect(selectors).toContain('.legacy-shell .eyebrow');
  });

  it('owns the application-wide reduced-motion primitive in modernBase only', () => {
    const reducedMotion = /@media\s*\(prefers-reduced-motion:\s*reduce\)/;
    expect(modernBaseCss).toMatch(reducedMotion);
    expect(modernBaseCss).toMatch(/\*,::before,::after\{animation-duration:\.01ms!important/);
    expect(legacyCss).not.toMatch(reducedMotion);
    expect(legacyCss).not.toMatch(/(?:^|[,{])\s*\*\s*(?:,|\{)/);
  });
});
