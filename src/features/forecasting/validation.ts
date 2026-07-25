import {
  FORECAST_DOMAIN_VERSION,
  type ForecastEvent,
  type ForecastOutcome,
  type UserExpectation,
  type UserForecast,
} from './types';

export type ForecastValidationCode =
  | 'MISSING_VERSION'
  | 'UNSUPPORTED_VERSION'
  | 'EMPTY_EVENT_ID'
  | 'EMPTY_TITLE'
  | 'TOO_FEW_OPTIONS'
  | 'EMPTY_OPTION_ID'
  | 'DUPLICATE_OPTION_ID'
  | 'EMPTY_OPTION_LABEL'
  | 'INVALID_TIMESTAMP'
  | 'INVALID_EVENT_WINDOW'
  | 'INVALID_RESOLUTION_DEFINITION'
  | 'INVALID_RESOLUTION_WINDOW'
  | 'RESOLUTION_NOT_AFTER_CLOSE'
  | 'INVALID_PROBABILITY'
  | 'EVENT_NOT_OPEN'
  | 'EVENT_ID_MISMATCH'
  | 'UNKNOWN_FORECAST_OPTION'
  | 'UNKNOWN_OUTCOME_OPTION'
  | 'FORECAST_BEFORE_OPEN'
  | 'FORECAST_AFTER_DEADLINE'
  | 'FORECAST_LOCKED'
  | 'DOMAIN_KIND_MISMATCH'
  | 'EVENT_NOT_RESOLVED'
  | 'OUTCOME_NOT_VERIFIED'
  | 'SCORE_BEFORE_OUTCOME';

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

const error = (code: ForecastValidationCode, path: string, message: string): ForecastValidationError => ({ code, path, message });

/** Combines composed validators without returning the same structured error twice. */
export function uniqueValidationErrors(...groups: ForecastValidationError[][]): ForecastValidationError[] {
  const seen = new Set<string>();
  return groups.flat().filter((item) => {
    const key = `${item.code}\u0000${item.path}\u0000${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Accepts a real UTC ISO-8601 instant, rejecting rollovers such as February 30. */
export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, fraction = '0'] = match;
  const milliseconds = Number(fraction.padEnd(3, '0'));
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second), milliseconds);
  const date = new Date(timestamp);
  return Number.isFinite(timestamp)
    && date.getUTCFullYear() === Number(year)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCDate() === Number(day)
    && date.getUTCHours() === Number(hour)
    && date.getUTCMinutes() === Number(minute)
    && date.getUTCSeconds() === Number(second)
    && date.getUTCMilliseconds() === milliseconds;
}

export function validateVersion(value: { version?: unknown }): ValidationResult {
  if (value.version === undefined || value.version === null || value.version === '') {
    return result([error('MISSING_VERSION', 'version', 'Persisted domain objects require a version.')]);
  }
  if (value.version !== FORECAST_DOMAIN_VERSION) {
    return result([error('UNSUPPORTED_VERSION', 'version', `Only ${FORECAST_DOMAIN_VERSION} is supported.`)]);
  }
  return result([]);
}

function validateTimestamp(value: unknown, path: string): ForecastValidationError[] {
  return isValidIsoTimestamp(value) ? [] : [error('INVALID_TIMESTAMP', path, `${path} must be a valid UTC ISO timestamp.`)];
}

export function validateForecastEvent(event: ForecastEvent): ValidationResult {
  const errors: ForecastValidationError[] = [...validateVersion(event).errors];
  if (!event.id.trim()) errors.push(error('EMPTY_EVENT_ID', 'id', 'Event id must not be empty.'));
  if (!event.title.trim()) errors.push(error('EMPTY_TITLE', 'title', 'Event title must not be empty.'));
  if (event.options.length < 2) errors.push(error('TOO_FEW_OPTIONS', 'options', 'An event requires at least two options.'));

  const seen = new Set<string>();
  event.options.forEach((option, index) => {
    if (!option.id.trim()) errors.push(error('EMPTY_OPTION_ID', `options.${index}.id`, 'Option id must not be empty.'));
    if (seen.has(option.id)) errors.push(error('DUPLICATE_OPTION_ID', `options.${index}.id`, `Option id "${option.id}" is not unique.`));
    if (!option.label.trim()) errors.push(error('EMPTY_OPTION_LABEL', `options.${index}.label`, 'Option label must not be empty.'));
    seen.add(option.id);
  });

  errors.push(...validateTimestamp(event.opensAt, 'opensAt'), ...validateTimestamp(event.closesAt, 'closesAt'));
  const opensAt = isValidIsoTimestamp(event.opensAt) ? Date.parse(event.opensAt) : null;
  const closesAt = isValidIsoTimestamp(event.closesAt) ? Date.parse(event.closesAt) : null;
  if (opensAt !== null && closesAt !== null && opensAt >= closesAt) {
    errors.push(error('INVALID_EVENT_WINDOW', 'closesAt', 'opensAt must be before closesAt.'));
  }

  const hasResolvesAt = event.resolvesAt !== undefined;
  const hasResolutionWindow = event.resolutionWindow !== undefined;
  if (hasResolvesAt === hasResolutionWindow) {
    errors.push(error('INVALID_RESOLUTION_DEFINITION', 'resolution', 'Provide exactly one of resolvesAt or resolutionWindow.'));
  } else if (hasResolvesAt) {
    errors.push(...validateTimestamp(event.resolvesAt, 'resolvesAt'));
    if (closesAt !== null && isValidIsoTimestamp(event.resolvesAt) && Date.parse(event.resolvesAt) <= closesAt) {
      errors.push(error('RESOLUTION_NOT_AFTER_CLOSE', 'resolvesAt', 'Resolution must occur after closesAt.'));
    }
  } else if (event.resolutionWindow) {
    const { startsAt, endsAt } = event.resolutionWindow;
    errors.push(...validateTimestamp(startsAt, 'resolutionWindow.startsAt'), ...validateTimestamp(endsAt, 'resolutionWindow.endsAt'));
    if (isValidIsoTimestamp(startsAt) && isValidIsoTimestamp(endsAt) && Date.parse(startsAt) >= Date.parse(endsAt)) {
      errors.push(error('INVALID_RESOLUTION_WINDOW', 'resolutionWindow', 'Resolution window start must be before its end.'));
    }
    if (closesAt !== null && isValidIsoTimestamp(startsAt) && Date.parse(startsAt) <= closesAt) {
      errors.push(error('RESOLUTION_NOT_AFTER_CLOSE', 'resolutionWindow.startsAt', 'Resolution window must start after closesAt.'));
    }
  }
  return result(errors);
}

export function validateProbability(probability: number): ValidationResult {
  return result(Number.isFinite(probability) && probability >= 0 && probability <= 1
    ? []
    : [error('INVALID_PROBABILITY', 'probability', 'Probability must be finite and between 0 and 1 inclusive.')]);
}

/** Validates a stored forecast independently of the event's current lifecycle status. */
export function validateForecastRecord(event: ForecastEvent, forecast: UserForecast): ValidationResult {
  const errors: ForecastValidationError[] = [...validateVersion(forecast).errors, ...validateProbability(forecast.probability).errors];
  if (forecast.eventId !== event.id) errors.push(error('EVENT_ID_MISMATCH', 'eventId', 'Forecast eventId must match event.id.'));
  if (!event.options.some((option) => option.id === forecast.selectedOptionId)) {
    errors.push(error('UNKNOWN_FORECAST_OPTION', 'selectedOptionId', 'Forecast references an unknown option.'));
  }
  errors.push(...validateTimestamp(forecast.createdAt, 'createdAt'));
  errors.push(...validateTimestamp(forecast.updatedAt, 'updatedAt'));
  if (forecast.lockedAt !== undefined) errors.push(...validateTimestamp(forecast.lockedAt, 'lockedAt'));
  if (isValidIsoTimestamp(forecast.createdAt) && isValidIsoTimestamp(event.opensAt) && Date.parse(forecast.createdAt) < Date.parse(event.opensAt)) {
    errors.push(error('FORECAST_BEFORE_OPEN', 'createdAt', 'Forecast cannot be submitted before opensAt.'));
  }
  if (isValidIsoTimestamp(forecast.createdAt) && isValidIsoTimestamp(event.closesAt) && Date.parse(forecast.createdAt) > Date.parse(event.closesAt)) {
    errors.push(error('FORECAST_AFTER_DEADLINE', 'createdAt', 'Forecast cannot be submitted after closesAt.'));
  }
  return result(errors);
}

/** Uses forecast.createdAt as the submission time; no caller-provided time can bypass the deadline. */
export function validateForecastSubmission(event: ForecastEvent, forecast: UserForecast): ValidationResult {
  const errors = uniqueValidationErrors(
    validateForecastEvent(event).errors,
    validateForecastRecord(event, forecast).errors,
  );
  if (event.status !== 'open') errors.push(error('EVENT_NOT_OPEN', 'status', 'Forecast submissions require an open event.'));
  return result(errors);
}

export function validateOutcome(event: ForecastEvent, outcome: ForecastOutcome): ValidationResult {
  const errors: ForecastValidationError[] = uniqueValidationErrors(
    validateForecastEvent(event).errors,
    validateVersion(outcome).errors,
  );
  if (outcome.eventId !== event.id) errors.push(error('EVENT_ID_MISMATCH', 'eventId', 'Outcome eventId must match event.id.'));
  if (!event.options.some((option) => option.id === outcome.resolvedOptionId)) {
    errors.push(error('UNKNOWN_OUTCOME_OPTION', 'resolvedOptionId', 'Outcome references an unknown option.'));
  }
  errors.push(...validateTimestamp(outcome.resolvedAt, 'resolvedAt'));
  return result(errors);
}

export function validateExpectation(event: ForecastEvent, expectation: UserExpectation): ValidationResult {
  const errors = uniqueValidationErrors(
    validateForecastEvent(event).errors,
    validateVersion(expectation).errors,
  );
  if (expectation.eventId !== event.id) errors.push(error('EVENT_ID_MISMATCH', 'eventId', 'Expectation eventId must match event.id.'));
  return result(errors);
}

export function validateForecastUpdate(event: ForecastEvent, previous: UserForecast, next: UserForecast): ValidationResult {
  const errors = [...validateForecastRecord(event, next).errors];
  const changed = JSON.stringify(previous) !== JSON.stringify(next);
  const updatedAtValid = isValidIsoTimestamp(next.updatedAt);
  const deadlinePassed = updatedAtValid
    && isValidIsoTimestamp(event.closesAt)
    && Date.parse(next.updatedAt) > Date.parse(event.closesAt);
  if (changed && (previous.lockedAt !== undefined || event.status !== 'open' || deadlinePassed)) {
    errors.push(error('FORECAST_LOCKED', 'lockedAt', 'A forecast cannot change after locking, closing, or its deadline.'));
  }
  return result(uniqueValidationErrors(errors));
}

export function validateDistinctDomainKind(value: UserExpectation | UserForecast, expected: 'expectation' | 'forecast'): ValidationResult {
  const isForecast = 'probability' in value || 'selectedOptionId' in value;
  return result((expected === 'forecast') === isForecast
    ? []
    : [error('DOMAIN_KIND_MISMATCH', '', 'Expectation and forecast are separate domain objects.')]);
}
