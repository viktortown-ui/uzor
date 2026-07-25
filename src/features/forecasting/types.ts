export type ForecastDomainVersion = 'forecast-domain-v1';

export const FORECAST_DOMAIN_VERSION: ForecastDomainVersion = 'forecast-domain-v1';

export type ForecastEventStatus =
  | 'draft'
  | 'open'
  | 'closed'
  | 'awaiting-outcome'
  | 'resolved'
  | 'cancelled';

export type ForecastResolutionSource =
  | 'official-publication'
  | 'municipal-service'
  | 'retailer-publication'
  | 'event-organizer'
  | 'other-reference';

export interface ForecastOption {
  id: string;
  label: string;
  description?: string;
}

export interface ForecastEvent {
  id: string;
  title: string;
  shortDescription: string;
  category: string;
  cityId?: string;
  geographicScope?: string;
  options: ForecastOption[];
  opensAt: string;
  closesAt: string;
  resolvesAt?: string;
  resolutionWindow?: { startsAt: string; endsAt: string };
  status: ForecastEventStatus;
  resolutionSource: ForecastResolutionSource;
  createdAt: string;
  version: ForecastDomainVersion;
}

/** A directional opinion, deliberately without a numeric probability. */
export interface UserExpectation {
  id: string;
  eventId?: string;
  direction: string;
  reasoning?: string;
  createdAt: string;
  updatedAt: string;
  version: ForecastDomainVersion;
}

export interface UserForecast {
  id: string;
  eventId: string;
  selectedOptionId: string;
  probability: number;
  confidenceLabel?: string;
  reasoning?: string;
  createdAt: string;
  updatedAt: string;
  lockedAt?: string;
  version: ForecastDomainVersion;
}

export type ForecastResolverStatus = 'verified' | 'disputed' | 'pending';

export interface ForecastOutcome {
  id: string;
  eventId: string;
  resolvedOptionId: string;
  resolvedAt: string;
  sourceReference: string;
  sourceType: ForecastResolutionSource;
  resolutionNote: string;
  resolverStatus: ForecastResolverStatus;
  version: ForecastDomainVersion;
}

export interface ForecastScore {
  id: string;
  eventId: string;
  forecastProbability: number;
  observedBinaryOutcome: 0 | 1;
  brierScore: number;
  scoredAt: string;
  scoringVersion: 'brier-binary-v1';
  version: ForecastDomainVersion;
}
