import type { ForecastEvent, UserForecast } from '../types';

export type ForecastLockReason = 'not_authenticated' | 'before_open' | 'deadline_passed' | 'event_not_open' | 'event_not_found' | null;
export interface ForecastWorkspace { event: ForecastEvent | null; forecast: UserForecast | null; serverTimestamp: string; authenticationRequired: boolean; submissionPermitted: boolean; locked: boolean; lockReason: ForecastLockReason; }
export interface SubmitForecastInput { eventId: string; optionId: string; probability: number; reasoning?: string; version: 'forecast-domain-v1'; }
export interface SubmitForecastResult { forecast: UserForecast; serverTimestamp: string; eventDeadline: string; created: boolean; locked: boolean; }
export type ForecastApiErrorCode = 'not_authenticated'|'forecast_event_not_found'|'forecast_event_not_open'|'forecast_not_started'|'forecast_deadline_passed'|'forecast_option_not_found'|'invalid_probability'|'invalid_reasoning'|'unsupported_forecast_version'|'invalid_response'|'unknown';
