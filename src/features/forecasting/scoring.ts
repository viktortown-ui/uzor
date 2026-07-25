import type { ForecastEvent, ForecastOutcome, ForecastScore, UserForecast } from './types';
import {
  validateForecastEvent,
  validateForecastRecord,
  validateOutcome,
  validateProbability,
  type ForecastValidationError,
} from './validation';

/**
 * Binary Brier Score v1: (p - o)^2. Lower is better: 0.00 is perfect;
 * values approaching 1.00 are very inaccurate.
 */
export function calculateBinaryBrierScore(probability: number, observed: 0 | 1): number {
  const validation = validateProbability(probability);
  if (!validation.valid) throw new RangeError(validation.errors[0].message);
  return (probability - observed) ** 2;
}

export type ScoreResult = { ok: true; score: ForecastScore } | { ok: false; errors: ForecastValidationError[] };

/** Scores the selected option as one binary claim for domain v1. */
export function scoreSelectedOption(
  event: ForecastEvent,
  forecast: UserForecast,
  outcome: ForecastOutcome,
  scoredAt: string,
): ScoreResult {
  const errors: ForecastValidationError[] = [
    ...validateForecastEvent(event).errors,
    ...validateForecastRecord(event, forecast).errors,
    ...validateOutcome(event, outcome).errors,
  ];
  if (event.status !== 'resolved') errors.push({ code: 'EVENT_NOT_RESOLVED', path: 'status', message: 'Only a resolved event can be scored.' });
  if (outcome.resolverStatus !== 'verified') errors.push({ code: 'OUTCOME_NOT_VERIFIED', path: 'resolverStatus', message: 'Final scoring requires a verified outcome.' });
  if (errors.length) return { ok: false, errors };
  const observedBinaryOutcome: 0 | 1 = forecast.selectedOptionId === outcome.resolvedOptionId ? 1 : 0;
  return {
    ok: true,
    score: {
      id: `${forecast.id}:${outcome.id}:brier-binary-v1`,
      eventId: event.id,
      forecastId: forecast.id,
      outcomeId: outcome.id,
      forecastProbability: forecast.probability,
      observedBinaryOutcome,
      brierScore: calculateBinaryBrierScore(forecast.probability, observedBinaryOutcome),
      scoredAt,
      scoringVersion: 'brier-binary-v1',
      version: forecast.version,
    },
  };
}
