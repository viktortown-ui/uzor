import type { ForecastEvent, ForecastOutcome, UserExpectation, UserForecast } from './types';

export type ForecastValidationCode =
  | 'MISSING_VERSION'
  | 'TOO_FEW_OPTIONS'
  | 'DUPLICATE_OPTION_ID'
  | 'INVALID_PROBABILITY'
  | 'FORECAST_AFTER_DEADLINE'
  | 'UNKNOWN_OPTION'
  | 'FORECAST_LOCKED'
  | 'DOMAIN_KIND_MISMATCH';

export interface ForecastValidationError {
  code: ForecastValidationCode;
  path: string;
  message: string;
}

export type ValidationResult =
  | { valid: true; errors: [] }
  | { valid: false; errors: ForecastValidationError[] };

const result = (errors: ForecastValidationError[]): ValidationResult =>
  errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };

export function validateVersion(value: { version?: unknown }): ValidationResult {
  return result(value.version
    ? []
    : [{ code: 'MISSING_VERSION', path: 'version', message: 'Persisted domain objects require a version.' }]);
}

export function validateForecastEvent(event: ForecastEvent): ValidationResult {
  const errors: ForecastValidationError[] = [...validateVersion(event).errors];
  if (event.options.length < 2) {
    errors.push({ code: 'TOO_FEW_OPTIONS', path: 'options', message: 'An event requires at least two options.' });
  }
  const seen = new Set<string>();
  event.options.forEach((option, index) => {
    if (seen.has(option.id)) {
      errors.push({ code: 'DUPLICATE_OPTION_ID', path: `options.${index}.id`, message: `Option id "${option.id}" is not unique.` });
    }
    seen.add(option.id);
  });
  return result(errors);
}

export function validateProbability(probability: number): ValidationResult {
  return result(Number.isFinite(probability) && probability >= 0 && probability <= 1
    ? []
    : [{ code: 'INVALID_PROBABILITY', path: 'probability', message: 'Probability must be between 0 and 1 inclusive.' }]);
}

export function validateForecastSubmission(event: ForecastEvent, forecast: UserForecast, submittedAt: string): ValidationResult {
  const errors: ForecastValidationError[] = [
    ...validateVersion(forecast).errors,
    ...validateProbability(forecast.probability).errors,
  ];
  if (!event.options.some((option) => option.id === forecast.selectedOptionId)) {
    errors.push({ code: 'UNKNOWN_OPTION', path: 'selectedOptionId', message: 'Forecast references an unknown option.' });
  }
  if (new Date(submittedAt).getTime() > new Date(event.closesAt).getTime()) {
    errors.push({ code: 'FORECAST_AFTER_DEADLINE', path: 'createdAt', message: 'A forecast cannot be submitted after closesAt.' });
  }
  return result(errors);
}

export function validateOutcome(event: ForecastEvent, outcome: ForecastOutcome): ValidationResult {
  const errors: ForecastValidationError[] = [...validateVersion(outcome).errors];
  if (!event.options.some((option) => option.id === outcome.resolvedOptionId)) {
    errors.push({ code: 'UNKNOWN_OPTION', path: 'resolvedOptionId', message: 'Outcome references an unknown option.' });
  }
  return result(errors);
}

export function validateForecastUpdate(previous: UserForecast, next: UserForecast): ValidationResult {
  if (previous.lockedAt && JSON.stringify(previous) !== JSON.stringify(next)) {
    return result([{ code: 'FORECAST_LOCKED', path: 'lockedAt', message: 'A locked forecast cannot be changed.' }]);
  }
  return result([]);
}

export function validateDistinctDomainKind(value: UserExpectation | UserForecast, expected: 'expectation' | 'forecast'): ValidationResult {
  const isForecast = 'probability' in value && 'selectedOptionId' in value;
  return result((expected === 'forecast') === isForecast
    ? []
    : [{ code: 'DOMAIN_KIND_MISMATCH', path: '', message: 'Expectation and forecast are separate domain objects.' }]);
}
