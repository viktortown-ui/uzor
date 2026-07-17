import type { DeltaDirection, DeltaMapItem, DeltaStatus } from '../deltas/deltaTypes';

export type CityPulseState = 'loading' | 'ready' | 'empty' | 'join' | 'error';
export type PersonalTraceState = 'loading' | 'ready' | 'empty' | 'join' | 'error';
export type MobilePulseSummary = { activeLast24Hours: number; checkingNow: number; confirmedNow: number; forkNow: number };
export type MobilePulseItem = {
  id: string; title: string; fallbackStatement: string; categoryTitle: string;
  direction: DeltaDirection; status: DeltaStatus; locationLabel: string;
  lastActivityAt: string; confirmCount: number; disconfirmCount: number;
  priorityScore: number; lat: number; lng: number; distanceMeters?: number;
};
export type MobilePulseData = { summary: MobilePulseSummary; items: MobilePulseItem[]; allItems: DeltaMapItem[]; loadedAt: Date };
