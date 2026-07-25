import { describe, expect, it } from 'vitest';
import { demoForecastEvents } from './fixtures';
import { statusAfterDeadline, validateStatusTransition } from './lifecycle';
import { calculateBinaryBrierScore, scoreSelectedOption } from './scoring';
import { FORECAST_DOMAIN_VERSION, type ForecastOutcome, type UserExpectation, type UserForecast } from './types';
import {
  validateDistinctDomainKind,
  validateForecastEvent,
  validateForecastSubmission,
  validateForecastUpdate,
  validateOutcome,
  validateProbability,
  validateVersion,
} from './validation';

const event = demoForecastEvents[0];
const forecast: UserForecast = {
  id: 'forecast-1', eventId: event.id, selectedOptionId: 'resolved', probability: 0.75,
  createdAt: '2026-07-30T10:00:00Z', updatedAt: '2026-07-30T10:00:00Z', version: FORECAST_DOMAIN_VERSION,
};
const outcome: ForecastOutcome = {
  id: 'outcome-1', eventId: event.id, resolvedOptionId: 'resolved', resolvedAt: '2026-08-02T18:00:00Z',
  sourceReference: 'https://example.invalid/demo-source', sourceType: 'municipal-service',
  resolutionNote: 'Демонстрационный результат.', resolverStatus: 'verified', version: FORECAST_DOMAIN_VERSION,
};

describe('forecast validation', () => {
  it('accepts inclusive probability bounds and rejects invalid values', () => {
    expect(validateProbability(0).valid).toBe(true);
    expect(validateProbability(1).valid).toBe(true);
    expect(validateProbability(-0.01).errors[0].code).toBe('INVALID_PROBABILITY');
    expect(validateProbability(1.01).valid).toBe(false);
  });

  it('reports duplicate option ids', () => {
    const duplicate = { ...event, options: [event.options[0], { ...event.options[1], id: event.options[0].id }] };
    expect(validateForecastEvent(duplicate).errors).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_OPTION_ID' })]));
  });

  it('reports an unknown resolved option', () => {
    expect(validateOutcome(event, { ...outcome, resolvedOptionId: 'unknown' }).errors[0].code).toBe('UNKNOWN_OPTION');
  });

  it('locks submission at the deterministic deadline and prevents locked edits', () => {
    expect(validateForecastSubmission(event, forecast, event.closesAt).valid).toBe(true);
    expect(validateForecastSubmission(event, forecast, '2026-08-01T18:00:00.001Z').errors[0].code).toBe('FORECAST_AFTER_DEADLINE');
    const locked = { ...forecast, lockedAt: event.closesAt };
    expect(validateForecastUpdate(locked, { ...locked, probability: 0.8 }).errors[0].code).toBe('FORECAST_LOCKED');
    expect(statusAfterDeadline('open', '2026-08-01T18:00:00.001Z', event.closesAt)).toBe('closed');
  });

  it('keeps expectation and calibrated forecast as separate shapes', () => {
    const expectation: UserExpectation = {
      id: 'expectation-1', eventId: event.id, direction: 'Скорее восстановят',
      createdAt: forecast.createdAt, updatedAt: forecast.updatedAt, version: FORECAST_DOMAIN_VERSION,
    };
    expect('probability' in expectation).toBe(false);
    expect(validateDistinctDomainKind(expectation, 'expectation').valid).toBe(true);
    expect(validateDistinctDomainKind(expectation, 'forecast').errors[0].code).toBe('DOMAIN_KIND_MISMATCH');
  });

  it('requires version fields on persisted objects', () => {
    expect(validateVersion({ version: FORECAST_DOMAIN_VERSION }).valid).toBe(true);
    expect(validateVersion({}).errors[0]).toMatchObject({ code: 'MISSING_VERSION', path: 'version' });
  });
});

describe('forecast event lifecycle', () => {
  it('allows every forward lifecycle transition', () => {
    expect(validateStatusTransition('draft', 'open').valid).toBe(true);
    expect(validateStatusTransition('open', 'closed').valid).toBe(true);
    expect(validateStatusTransition('closed', 'awaiting-outcome').valid).toBe(true);
    expect(validateStatusTransition('awaiting-outcome', 'resolved').valid).toBe(true);
  });

  it('forbids skipped and reverse transitions', () => {
    expect(validateStatusTransition('draft', 'resolved').valid).toBe(false);
    expect(validateStatusTransition('closed', 'open').error?.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('requires explicit cancellation and treats resolved and cancelled as terminal', () => {
    expect(validateStatusTransition('open', 'cancelled').valid).toBe(false);
    expect(validateStatusTransition('open', 'cancelled', { explicitCancellation: true }).valid).toBe(true);
    expect(validateStatusTransition('resolved', 'cancelled', { explicitCancellation: true }).valid).toBe(false);
    expect(validateStatusTransition('cancelled', 'open').valid).toBe(false);
  });
});

describe('Brier Score v1', () => {
  it('scores a perfect forecast as 0.00', () => expect(calculateBinaryBrierScore(1, 1)).toBe(0));

  it('scores an incorrect confident forecast as 1.00', () => expect(calculateBinaryBrierScore(1, 0)).toBe(1));

  it('squares an intermediate probability distance', () => expect(calculateBinaryBrierScore(0.6, 1)).toBeCloseTo(0.16));

  it('forbids final scoring before verified resolution', () => {
    expect(scoreSelectedOption(event, forecast, outcome, '2026-08-02T19:00:00Z').ok).toBe(false);
    expect(scoreSelectedOption({ ...event, status: 'cancelled' }, forecast, outcome, '2026-08-02T19:00:00Z').ok).toBe(false);
  });

  it('scores the selected option as a binary claim after resolution', () => {
    const result = scoreSelectedOption({ ...event, status: 'resolved' }, forecast, outcome, '2026-08-02T19:00:00Z');
    expect(result.ok && result.score).toMatchObject({ observedBinaryOutcome: 1, brierScore: 0.0625, scoringVersion: 'brier-binary-v1' });
  });
});
