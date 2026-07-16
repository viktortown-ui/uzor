import { describe, expect, it } from 'vitest';
import { isFatalMapLibreError } from './mapLibreErrorPolicy';

describe('mapLibreErrorPolicy', () => {
  it.each(['Failed to load style https://example.test/style.json', 'style parse failure'])('blocks explicit initial style failure: %s', (message) => {
    expect(isFatalMapLibreError({ error: { message } }, false)).toBe(true);
  });
  it.each(['Failed to load tile https://example.test/1/2/3.pbf', 'glyph request failed', 'sprite image failed', 'source tile timeout'])('keeps initial resource failure non-fatal: %s', (message) => {
    expect(isFatalMapLibreError({ error: { message } }, false)).toBe(false);
  });
  it('keeps failures non-fatal after the map is usable', () => {
    expect(isFatalMapLibreError({ error: { message: 'Failed to load style https://example.test/style.json' } }, true)).toBe(false);
  });
});
