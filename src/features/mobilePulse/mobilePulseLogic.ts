import type { DeltaCard, DeltaMapItem } from '../deltas/deltaTypes';
import { haversineDistanceM } from '../deltaCreate/deltaGeoLogic';
import type { MobilePulseItem, MobilePulseSummary } from './mobilePulseTypes';

export const PULSE_FEED_LIMIT = 5;
export const PERM_FALLBACK_RADIUS_M = 30_000; // Used only when active-city metadata has no usable radius.
const DAY_MS = 24 * 60 * 60 * 1000;

export function boundsFromCenterRadius(centerLat: number, centerLng: number, radiusMeters: number) {
  const lat = Math.max(-90, Math.min(90, Number.isFinite(centerLat) ? centerLat : 0));
  const lng = Math.max(-180, Math.min(180, Number.isFinite(centerLng) ? centerLng : 0));
  const radius = Math.max(0, Number.isFinite(radiusMeters) ? radiusMeters : 0);
  const latDelta = radius / 111_320;
  const cosine = Math.max(Math.abs(Math.cos(lat * Math.PI / 180)), 1e-6);
  const lngDelta = radius / (111_320 * cosine);
  return { minLat: Math.max(-90, lat - latDelta), maxLat: Math.min(90, lat + latDelta), minLng: Math.max(-180, lng - lngDelta), maxLng: Math.min(180, lng + lngDelta) };
}
export function summarizePulse(items: DeltaMapItem[], now = new Date()): MobilePulseSummary {
  const visible = items.filter((item) => item.status !== 'archived');
  const boundary = now.getTime() - DAY_MS;
  return {
    activeLast24Hours: visible.filter((item) => { const time = Date.parse(item.lastActivityAt); return Number.isFinite(time) && time >= boundary && time <= now.getTime(); }).length,
    checkingNow: visible.filter((item) => item.status === 'checking').length,
    confirmedNow: visible.filter((item) => item.status === 'confirmed').length,
    forkNow: visible.filter((item) => item.status === 'fork').length,
  };
}
export function sortCityItems<T extends Pick<DeltaMapItem, 'id' | 'lastActivityAt' | 'priorityScore'>>(items: T[]): T[] {
  return [...items].sort((a, b) => (Date.parse(b.lastActivityAt) || 0) - (Date.parse(a.lastActivityAt) || 0) || b.priorityScore - a.priorityScore || a.id.localeCompare(b.id));
}
export function titleFor(item: Pick<DeltaMapItem, 'statement'>, card?: Pick<DeltaCard, 'subject'> | null) { return card?.subject.trim() || item.statement.trim() || 'Изменение без заголовка'; }
export function toPulseItem(item: DeltaMapItem, card?: DeltaCard | null): MobilePulseItem { return { id:item.id, title:titleFor(item, card), fallbackStatement:item.statement, categoryTitle:item.category.title, direction:item.direction, status:item.status, locationLabel:item.location.label, lastActivityAt:item.lastActivityAt, confirmCount:item.confirmCount, disconfirmCount:item.disconfirmCount, priorityScore:item.priorityScore, lat:item.location.lat, lng:item.location.lng }; }
export function sortNearbyMapItems(items: DeltaMapItem[], lat: number, lng: number) { return items.map(item => ({ ...item, distanceMeters:haversineDistanceM(lat,lng,item.location.lat,item.location.lng) })).sort((a,b)=>a.distanceMeters-b.distanceMeters||a.id.localeCompare(b.id)); }
export function sortNearby(items: MobilePulseItem[], lat: number, lng: number): MobilePulseItem[] { return items.map(item => ({ ...item, distanceMeters:haversineDistanceM(lat,lng,item.lat,item.lng) })).sort((a,b)=>(a.distanceMeters??Infinity)-(b.distanceMeters??Infinity)||a.id.localeCompare(b.id)); }
export function formatPulseActivity(lastActivityAt: string, now: Date): string {
  const time=Date.parse(lastActivityAt); const difference=now.getTime()-time; const tolerance=60_000;
  if(!Number.isFinite(time)||difference < -tolerance) return 'время активности неизвестно';
  if(difference < 60_000) return 'активность только что';
  const minutes=Math.floor(difference/60_000); if(minutes<60) return `активность ${minutes} мин. назад`;
  const hours=Math.floor(minutes/60); if(hours<24) return `активность ${hours} ч. назад`;
  return `активность ${Math.floor(hours/24)} дн. назад`;
}
