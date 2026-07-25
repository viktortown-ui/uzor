import { describe, expect, it } from 'vitest';
import { demoForecastEvents } from './fixtures';
import { statusAfterDeadline, validateStatusTransition } from './lifecycle';
import { calculateBinaryBrierScore, scoreSelectedOption } from './scoring';
import { FORECAST_DOMAIN_VERSION, type ForecastEvent, type ForecastOutcome, type UserExpectation, type UserForecast } from './types';
import {
  isValidIsoTimestamp,
  validateDistinctDomainKind,
  validateExpectation,
  validateForecastEvent,
  validateForecastSubmission,
  validateForecastUpdate,
  validateOutcome,
  validateProbability,
  validateVersion,
} from './validation';

const event: ForecastEvent = { ...demoForecastEvents[0], status: 'open' };
const forecast: UserForecast = {
  id: 'forecast-1', eventId: event.id, selectedOptionId: 'resolved', probability: 0.75,
  createdAt: '2026-07-30T10:00:00Z', updatedAt: '2026-07-30T10:00:00Z', version: FORECAST_DOMAIN_VERSION,
};
const outcome: ForecastOutcome = {
  id: 'outcome-1', eventId: event.id, resolvedOptionId: 'resolved', resolvedAt: '2026-08-02T18:00:00Z',
  sourceReference: 'https://example.invalid/demo-source', sourceType: 'municipal-service',
  resolutionNote: 'Демонстрационный результат.', resolverStatus: 'verified', version: FORECAST_DOMAIN_VERSION,
};
const codes = (value: { errors: { code: string }[] }) => value.errors.map(({ code }) => code);

describe('forecast event contract', () => {
  it('accepts every complete demo event', () => {
    expect(demoForecastEvents.every((fixture) => validateForecastEvent(fixture).valid)).toBe(true);
  });

  it('requires non-empty event identity and title', () => {
    expect(codes(validateForecastEvent({ ...event, id: '', title: ' ' }))).toEqual(expect.arrayContaining(['EMPTY_EVENT_ID', 'EMPTY_TITLE']));
  });

  it('requires at least two options with non-empty unique ids and labels', () => {
    expect(codes(validateForecastEvent({ ...event, options: [{ id: '', label: '' }] }))).toEqual(expect.arrayContaining(['TOO_FEW_OPTIONS', 'EMPTY_OPTION_ID', 'EMPTY_OPTION_LABEL']));
    const duplicate = { ...event, options: [event.options[0], { ...event.options[1], id: event.options[0].id }] };
    expect(codes(validateForecastEvent(duplicate))).toContain('DUPLICATE_OPTION_ID');
  });

  it('requires valid ordered opening and closing timestamps', () => {
    expect(isValidIsoTimestamp('2026-02-30T00:00:00Z')).toBe(false);
    expect(codes(validateForecastEvent({ ...event, opensAt: 'not-a-date' }))).toContain('INVALID_TIMESTAMP');
    expect(codes(validateForecastEvent({ ...event, opensAt: event.closesAt }))).toContain('INVALID_EVENT_WINDOW');
  });

  it('requires exactly one resolution definition', () => {
    expect(codes(validateForecastEvent({ ...event, resolvesAt: undefined, resolutionWindow: undefined }))).toContain('INVALID_RESOLUTION_DEFINITION');
    expect(codes(validateForecastEvent({ ...event, resolutionWindow: { startsAt: '2026-08-03T00:00:00Z', endsAt: '2026-08-04T00:00:00Z' } }))).toContain('INVALID_RESOLUTION_DEFINITION');
  });

  it('requires an ordered resolution window after closing', () => {
    const withoutInstant = { ...event, resolvesAt: undefined };
    expect(codes(validateForecastEvent({ ...withoutInstant, resolutionWindow: { startsAt: '2026-08-03T00:00:00Z', endsAt: '2026-08-02T00:00:00Z' } }))).toContain('INVALID_RESOLUTION_WINDOW');
    expect(codes(validateForecastEvent({ ...withoutInstant, resolutionWindow: { startsAt: event.closesAt, endsAt: '2026-08-02T00:00:00Z' } }))).toContain('RESOLUTION_NOT_AFTER_CLOSE');
  });

  it('requires an instant resolution after closing', () => {
    expect(codes(validateForecastEvent({ ...event, resolvesAt: event.closesAt }))).toContain('RESOLUTION_NOT_AFTER_CLOSE');
  });
});

describe('forecast submission validation', () => {
  it('accepts inclusive finite probability bounds and rejects invalid values', () => {
    expect(validateProbability(0).valid).toBe(true);
    expect(validateProbability(1).valid).toBe(true);
    expect(codes(validateProbability(-0.01))).toContain('INVALID_PROBABILITY');
    expect(validateProbability(Number.NaN).valid).toBe(false);
  });

  it('rejects a forecast belonging to another event', () => {
    expect(codes(validateForecastSubmission(event, { ...forecast, eventId: 'another-event' }))).toContain('EVENT_ID_MISMATCH');
  });

  it.each(['draft', 'closed'] as const)('rejects submission while event is %s', (status) => {
    expect(codes(validateForecastSubmission({ ...event, status }, forecast))).toContain('EVENT_NOT_OPEN');
  });

  it('rejects submission before opensAt', () => {
    expect(codes(validateForecastSubmission(event, { ...forecast, createdAt: '2026-07-26T08:59:59Z' }))).toContain('FORECAST_BEFORE_OPEN');
  });

  it('accepts the deadline itself and rejects a stored timestamp after closesAt', () => {
    expect(validateForecastSubmission(event, { ...forecast, createdAt: event.closesAt }).valid).toBe(true);
    expect(codes(validateForecastSubmission(event, { ...forecast, createdAt: '2026-08-01T18:00:00.001Z' }))).toContain('FORECAST_AFTER_DEADLINE');
    expect(statusAfterDeadline('open', '2026-08-01T18:00:00.001Z', event.closesAt)).toBe('closed');
  });

  it('rejects an invalid stored submission timestamp', () => {
    expect(codes(validateForecastSubmission(event, { ...forecast, createdAt: 'yesterday' }))).toContain('INVALID_TIMESTAMP');
  });

  it('rejects an unknown selected option with its own code', () => {
    expect(codes(validateForecastSubmission(event, { ...forecast, selectedOptionId: 'unknown' }))).toContain('UNKNOWN_FORECAST_OPTION');
  });

  it('prevents changes to a locked forecast', () => {
    const locked = { ...forecast, lockedAt: event.closesAt };
    expect(codes(validateForecastUpdate(event, locked, { ...locked, probability: 0.8 }))).toContain('FORECAST_LOCKED');
  });

  it('derives locking from event state and updatedAt even without lockedAt', () => {
    expect(codes(validateForecastUpdate({ ...event, status: 'closed' }, forecast, { ...forecast, probability: 0.8 }))).toContain('FORECAST_LOCKED');
    expect(codes(validateForecastUpdate(event, forecast, { ...forecast, probability: 0.8, updatedAt: '2026-08-01T18:00:00.001Z' }))).toContain('FORECAST_LOCKED');
  });
});

describe('outcome and version validation', () => {
  it('rejects a cross-event outcome', () => {
    expect(codes(validateOutcome(event, { ...outcome, eventId: 'another-event' }))).toContain('EVENT_ID_MISMATCH');
  });

  it('rejects an unknown resolved option with its own code', () => {
    expect(codes(validateOutcome(event, { ...outcome, resolvedOptionId: 'unknown' }))).toContain('UNKNOWN_OUTCOME_OPTION');
  });

  it('requires a valid resolvedAt timestamp', () => {
    expect(codes(validateOutcome(event, { ...outcome, resolvedAt: 'invalid' }))).toContain('INVALID_TIMESTAMP');
  });

  it('distinguishes missing from unsupported versions', () => {
    expect(codes(validateVersion({}))).toContain('MISSING_VERSION');
    expect(codes(validateVersion({ version: 'forecast-domain-v2' }))).toContain('UNSUPPORTED_VERSION');
    expect(validateVersion({ version: FORECAST_DOMAIN_VERSION }).valid).toBe(true);
  });

  it('validates exact versions for event, forecast, outcome and expectation', () => {
    expect(codes(validateForecastEvent({ ...event, version: 'bad' as ForecastEvent['version'] }))).toContain('UNSUPPORTED_VERSION');
    expect(codes(validateForecastSubmission(event, { ...forecast, version: 'bad' as UserForecast['version'] }))).toContain('UNSUPPORTED_VERSION');
    expect(codes(validateOutcome(event, { ...outcome, version: 'bad' as ForecastOutcome['version'] }))).toContain('UNSUPPORTED_VERSION');
    const expectation: UserExpectation = { id: 'expectation-1', eventId: event.id, direction: 'Скорее да', createdAt: forecast.createdAt, updatedAt: forecast.updatedAt, version: FORECAST_DOMAIN_VERSION };
    expect(validateExpectation(event, expectation).valid).toBe(true);
    expect(codes(validateExpectation(event, { ...expectation, version: 'bad' as UserExpectation['version'] }))).toContain('UNSUPPORTED_VERSION');
  });

  it('keeps an event-bound expectation separate from a forecast', () => {
    const expectation: UserExpectation = { id: 'expectation-1', eventId: event.id, direction: 'Скорее восстановят', createdAt: forecast.createdAt, updatedAt: forecast.updatedAt, version: FORECAST_DOMAIN_VERSION };
    expect('probability' in expectation || 'selectedOptionId' in expectation).toBe(false);
    expect(validateDistinctDomainKind(expectation, 'expectation').valid).toBe(true);
    expect(codes(validateDistinctDomainKind(expectation, 'forecast'))).toContain('DOMAIN_KIND_MISMATCH');
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

  it('requires explicit cancellation and treats terminal states as terminal', () => {
    expect(validateStatusTransition('open', 'cancelled').valid).toBe(false);
    expect(validateStatusTransition('open', 'cancelled', { explicitCancellation: true }).valid).toBe(true);
    expect(validateStatusTransition('resolved', 'cancelled', { explicitCancellation: true }).valid).toBe(false);
    expect(validateStatusTransition('cancelled', 'open').valid).toBe(false);
  });

  it('rejects malformed lifecycle timestamps instead of silently remaining open', () => {
    expect(() => statusAfterDeadline('open', 'invalid', event.closesAt)).toThrow(RangeError);
    expect(() => statusAfterDeadline('open', forecast.createdAt, 'invalid')).toThrow(RangeError);
  });
});

describe('Brier Score v1', () => {
  it('scores a perfect forecast as 0.00', () => expect(calculateBinaryBrierScore(1, 1)).toBe(0));
  it('scores an incorrect confident forecast as 1.00', () => expect(calculateBinaryBrierScore(1, 0)).toBe(1));
  it('squares an intermediate probability distance', () => expect(calculateBinaryBrierScore(0.6, 1)).toBeCloseTo(0.16));

  it.each(['draft', 'open', 'closed', 'awaiting-outcome', 'cancelled'] as const)('forbids scoring a %s event', (status) => {
    expect(scoreSelectedOption({ ...event, status }, forecast, outcome, '2026-08-02T19:00:00Z').ok).toBe(false);
  });

  it.each(['disputed', 'pending'] as const)('forbids a %s outcome', (resolverStatus) => {
    const result = scoreSelectedOption({ ...event, status: 'resolved' }, forecast, { ...outcome, resolverStatus }, '2026-08-02T19:00:00Z');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(codes(result)).toContain('OUTCOME_NOT_VERIFIED');
  });

  it('rejects cross-event objects and an unknown forecast option', () => {
    const resolved = { ...event, status: 'resolved' as const };
    const crossForecast = scoreSelectedOption(resolved, { ...forecast, eventId: 'other', selectedOptionId: 'unknown' }, outcome, '2026-08-02T19:00:00Z');
    const crossOutcome = scoreSelectedOption(resolved, forecast, { ...outcome, eventId: 'other' }, '2026-08-02T19:00:00Z');
    if (!crossForecast.ok) expect(codes(crossForecast)).toEqual(expect.arrayContaining(['EVENT_ID_MISMATCH', 'UNKNOWN_FORECAST_OPTION']));
    if (!crossOutcome.ok) expect(codes(crossOutcome)).toContain('EVENT_ID_MISMATCH');
  });

  it('creates an auditable score only after verified resolution', () => {
    const result = scoreSelectedOption({ ...event, status: 'resolved' }, forecast, outcome, '2026-08-02T19:00:00Z');
    expect(result.ok && result.score).toMatchObject({
      eventId: event.id, forecastId: forecast.id, outcomeId: outcome.id,
      observedBinaryOutcome: 1, brierScore: 0.0625, scoringVersion: 'brier-binary-v1', version: FORECAST_DOMAIN_VERSION,
    });
    if (result.ok) expect(validateVersion(result.score).valid).toBe(true);
  });
});
