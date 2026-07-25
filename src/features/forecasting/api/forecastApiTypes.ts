import type { ForecastEvent, ForecastOutcome, UserForecast } from '../types';

export type ForecastLockReason = 'not_authenticated' | 'before_open' | 'deadline_passed' | 'event_not_open' | 'event_not_found' | null;
export interface ForecastWorkspace { event: ForecastEvent | null; forecast: UserForecast | null; outcome: ForecastOutcome | null; serverTimestamp: string; authenticationRequired: boolean; submissionPermitted: boolean; locked: boolean; lockReason: ForecastLockReason; }
export interface SubmitForecastInput { eventId: string; optionId: string; probability: number; reasoning?: string; version: 'forecast-domain-v1'; }
export interface SubmitForecastResult { forecast: UserForecast; serverTimestamp: string; eventDeadline: string; created: boolean; locked: boolean; }
export type ForecastResolutionBlockReason = 'not_authenticated'|'resolver_not_authorized'|'event_not_found'|'event_cancelled'|'outcome_already_resolved'|'forecast_still_open'|'resolution_time_not_reached'|null;
export interface ForecastResolutionWorkspace { event: ForecastEvent|null; outcome: ForecastOutcome|null; serverTimestamp:string; authorized:boolean; canResolve:boolean; blockReason:ForecastResolutionBlockReason; }
export interface ResolveForecastInput { eventId:string; resolvedOptionId:string; sourceReference:string; resolutionNote:string; version:'forecast-domain-v1'; }
export interface ResolveForecastResult { event:ForecastEvent; eventUpdatedAt:string; outcome:ForecastOutcome; serverTimestamp:string; }
export type ForecastApiErrorCode = 'not_authenticated'|'forecast_resolver_not_authorized'|'forecast_event_not_found'|'forecast_event_cancelled'|'forecast_event_already_resolved'|'forecast_outcome_already_exists'|'forecast_event_still_open'|'forecast_resolution_time_not_reached'|'forecast_outcome_option_not_found'|'invalid_source_reference'|'invalid_resolution_note'|'forecast_outcome_write_failed'|'forecast_event_not_open'|'forecast_not_started'|'forecast_deadline_passed'|'forecast_option_not_found'|'invalid_probability'|'invalid_reasoning'|'unsupported_forecast_version'|'invalid_response'|'unknown';
