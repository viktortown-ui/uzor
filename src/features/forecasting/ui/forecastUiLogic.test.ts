import { describe, expect, it } from 'vitest';
import { demoForecastEvents } from '..';
import { buildDemoForecast, createInteractiveDemoEvent, formatResolution, formatRussianUtcDateTime, normalizeReasoning, percentageToProbability, validateDemoForecast } from './forecastUiLogic';

describe('forecast UI logic', () => {
  it('creates an open interactive copy without mutating fixtures', () => {
    const before = JSON.stringify(demoForecastEvents);
    const event = createInteractiveDemoEvent();
    expect(event.status).toBe('open');
    expect(event.shortDescription).toBe(demoForecastEvents[1].shortDescription);
    expect(event.resolutionSource).toBe(demoForecastEvents[1].resolutionSource);
    expect(JSON.stringify(demoForecastEvents)).toBe(before);
    expect(event).not.toBe(demoForecastEvents[1]);
  });
  it('converts percentages only by dividing by 100', () => expect(percentageToProbability(70)).toBe(0.7));
  it('converts the initial 50% state to probability 0.5', () => expect(percentageToProbability(50)).toBe(0.5));
  it('normalizes whitespace-only optional reasoning', () => expect(normalizeReasoning('   \n')).toBeUndefined());
  it('uses fixed timestamps and passes domain submission validation', () => {
    const event = createInteractiveDemoEvent();
    const forecast = buildDemoForecast(event, event.options[0].id, 70, '  Причина  ');
    expect(forecast).toMatchObject({ probability: .7, reasoning: 'Причина', createdAt: '2026-07-30T12:00:00Z', updatedAt: '2026-07-30T12:00:00Z' });
    expect(validateDemoForecast(event, forecast)).toEqual({ valid: true, errors: [] });
  });
  it('formats Russian dates deterministically in UTC', () => {
    expect(formatRussianUtcDateTime('2026-08-09T12:00:00Z')).toBe('9 августа 2026 г. в 12:00 UTC');
    expect(formatResolution(createInteractiveDemoEvent())).toContain('10 августа 2026 г.');
  });
});
