import { describe, expect, it } from 'vitest';
import { permLocalDateTimeToIso } from './ForecastProposalForm';
describe('Perm deadline conversion', () => {
  it('converts Perm local time using the explicit UTC+05 offset', () => {
    expect(permLocalDateTimeToIso('2026-09-01T12:30')).toBe('2026-09-01T07:30:00.000Z');
  });
});
