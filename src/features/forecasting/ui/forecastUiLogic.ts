import {
  FORECAST_DOMAIN_VERSION,
  demoForecastEvents,
  validateForecastSubmission,
  type ForecastEvent,
  type ForecastEventStatus,
  type ForecastResolutionSource,
  type ForecastValidationCode,
  type UserForecast,
  type ValidationResult,
} from '..';

export const FORECAST_DEMO_CLOCK = '2026-07-30T12:00:00Z';

export function createInteractiveDemoEvent(): ForecastEvent {
  const source = demoForecastEvents[1];
  return {
    ...source,
    status: 'open',
    options: source.options.map((option) => ({ ...option })),
    resolutionWindow: source.resolutionWindow ? { ...source.resolutionWindow } : undefined,
  };
}

export function formatRussianUtcDateTime(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatResolution(event: ForecastEvent): string {
  if (event.resolvesAt) return formatRussianUtcDateTime(event.resolvesAt);
  if (event.resolutionWindow) return `${formatRussianUtcDateTime(event.resolutionWindow.startsAt)} — ${formatRussianUtcDateTime(event.resolutionWindow.endsAt)}`;
  return 'Не указано';
}

const sourceLabels: Record<ForecastResolutionSource, string> = {
  'official-publication': 'официальная публикация',
  'municipal-service': 'сообщение муниципальной службы',
  'retailer-publication': 'публичная публикация продавца',
  'event-organizer': 'публикация организатора',
  'other-reference': 'другой проверяемый источник',
};

const statusLabels: Record<ForecastEventStatus, string> = {
  draft: 'Черновик', open: 'Приём прогнозов открыт', closed: 'Приём прогнозов закрыт',
  'awaiting-outcome': 'Ожидается проверка исхода', resolved: 'Исход проверен', cancelled: 'Событие отменено',
};

export const formatResolutionSource = (source: ForecastResolutionSource) => sourceLabels[source];
export const formatEventStatus = (status: ForecastEventStatus) => statusLabels[status];
export const percentageToProbability = (percentage: number) => percentage / 100;
export const normalizeReasoning = (reasoning: string): string | undefined => reasoning.trim() || undefined;

export function parsePercentage(value: string): { valid: true; percentage: number } | { valid: false; message: string } {
  if (value.trim() === '') return { valid: false, message: 'Укажите вероятность от 0% до 100%.' };
  const percentage = Number(value);
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return { valid: false, message: 'Вероятность должна быть числом от 0% до 100%.' };
  }
  return { valid: true, percentage };
}

const validationMessages: Partial<Record<ForecastValidationCode, string>> = {
  INVALID_PROBABILITY: 'Укажите корректную вероятность от 0% до 100%.',
  EVENT_NOT_OPEN: 'Для этого события сейчас нельзя собрать прогноз.',
  UNKNOWN_FORECAST_OPTION: 'Выберите один из доступных вариантов.',
  FORECAST_BEFORE_OPEN: 'Время сценария наступает до открытия события.',
  FORECAST_AFTER_DEADLINE: 'Срок приёма прогнозов уже истёк.',
};

export function validationResultMessage(result: ValidationResult): string | undefined {
  if (result.valid) return undefined;
  return validationMessages[result.errors[0].code] ?? 'Не удалось проверить прогноз. Проверьте данные события.';
}

export function buildDemoForecast(event: ForecastEvent, selectedOptionId: string, percentage: number, reasoning: string): UserForecast {
  return {
    id: 'demo-user-forecast-ui-v1', eventId: event.id, selectedOptionId,
    probability: percentageToProbability(percentage), reasoning: normalizeReasoning(reasoning),
    createdAt: FORECAST_DEMO_CLOCK, updatedAt: FORECAST_DEMO_CLOCK, version: FORECAST_DOMAIN_VERSION,
  };
}

export function validateDemoForecast(event: ForecastEvent, forecast: UserForecast): ValidationResult {
  return validateForecastSubmission(event, forecast);
}
