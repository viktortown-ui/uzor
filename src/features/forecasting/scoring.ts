import type { ForecastEvent, ForecastOutcome, ForecastScore, UserForecast } from './types';
import { validateOutcome, validateProbability, type ForecastValidationError } from './validation';

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
  const errors: ForecastValidationError[] = [...validateOutcome(event, outcome).errors];
  if (event.status !== 'resolved' || outcome.resolverStatus !== 'verified') {
    errors.push({ code: 'DOMAIN_KIND_MISMATCH', path: 'status', message: 'Only a resolved event with a verified outcome can be scored.' });
  }
  const probabilityValidation = validateProbability(forecast.probability);
  errors.push(...probabilityValidation.errors);
  if (errors.length) return { ok: false, errors };
  const observedBinaryOutcome: 0 | 1 = forecast.selectedOptionId === outcome.resolvedOptionId ? 1 : 0;
  return {
    ok: true,
    score: {
      id: `${forecast.id}:${outcome.id}:brier-binary-v1`,
      eventId: event.id,
      forecastProbability: forecast.probability,
      observedBinaryOutcome,
      brierScore: calculateBinaryBrierScore(forecast.probability, observedBinaryOutcome),
      scoredAt,
      scoringVersion: 'brier-binary-v1',
      version: forecast.version,
    },
  };
}
