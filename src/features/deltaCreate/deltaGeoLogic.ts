import type { DeltaMapItem } from '../deltas/deltaTypes';
import type { FindSimilarDeltaInput } from '../deltas/deltaTypes';
import type { DeltaCreateDraft } from './deltaCreateTypes';
import { PERM_FALLBACK } from '../deltaMap/deltaMapLogic';

export type CoordinateType = 'lat' | 'lng';
export type SimilarResetField = 'location' | 'lat' | 'lng' | 'locationLabel' | 'categorySlug' | 'direction' | 'changeType' | 'subject' | 'statement' | 'details';
export type SimilarSearchRow = Pick<DeltaMapItem, 'id' | 'statement' | 'status' | 'confirmCount' | 'disconfirmCount' | 'lastActivityAt'> & { distanceMeters: number; locationLabel: string; createdAt?: string };

export function isValidCoordinate(value: unknown, type: CoordinateType) { if (typeof value !== 'number' || !Number.isFinite(value)) return false; return type === 'lat' ? value >= -90 && value <= 90 : value >= -180 && value <= 180; }
export function isLocationComplete(draft: Pick<DeltaCreateDraft, 'lat' | 'lng' | 'locationLabel' | 'locationSource'>) { return isValidCoordinate(draft.lat, 'lat') && isValidCoordinate(draft.lng, 'lng') && draft.locationLabel.trim().length > 0 && !!draft.locationSource; }
export function formatDistance(meters: number) { if (!Number.isFinite(meters)) return 'примерно рядом'; if (meters < 1000) return `примерно ${Math.max(0, Math.round(meters))} м`; return `примерно ${(meters / 1000).toFixed(1).replace('.', ',')} км`; }
export function shouldResetSimilarDecision(field: SimilarResetField | string) { return ['location','lat','lng','locationLabel','categorySlug','direction','changeType','subject','statement'].includes(field); }
export const PERM_MVP_RADIUS_M = 60000;
export const PERM_MVP_AREA_ERROR = 'Сейчас Дельты можно добавлять только в Перми и ближайших районах.';
export function haversineDistanceM(aLat:number,aLng:number,bLat:number,bLng:number){ const r=6371000; const toRad=(v:number)=>v*Math.PI/180; const dLat=toRad(bLat-aLat); const dLng=toRad(bLng-aLng); const x=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2; return 2*r*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
export function isWithinPermMvpArea(lat: unknown, lng: unknown, radiusM = PERM_MVP_RADIUS_M) { return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && haversineDistanceM(PERM_FALLBACK.lat, PERM_FALLBACK.lng, lat, lng) <= radiusM; }
function distanceM(aLat:number,aLng:number,bLat:number,bLng:number){ return haversineDistanceM(aLat,aLng,bLat,bLng); }
export function findDemoSimilarDeltas(draft: DeltaCreateDraft, items: DeltaMapItem[]): SimilarSearchRow[] { if (!isLocationComplete(draft) || !draft.categorySlug || !draft.direction) return []; const since=Date.now()-14*24*60*60*1000; return items.filter(i=>i.category.slug===draft.categorySlug && i.direction===draft.direction).map(i=>({...i,distanceMeters:distanceM(draft.lat!,draft.lng!,i.location.lat,i.location.lng),locationLabel:i.location.label,createdAt:i.lastActivityAt})).filter(i=>i.distanceMeters<=1000 && (!i.lastActivityAt || new Date(i.lastActivityAt).getTime()>=since)).sort((a,b)=>a.distanceMeters-b.distanceMeters).slice(0,5); }
export function buildSimilarSearchInput(draft: DeltaCreateDraft, circleId: string): FindSimilarDeltaInput | null { if (!isLocationComplete(draft) || !draft.categorySlug || !draft.direction || !draft.changeType || !isWithinPermMvpArea(draft.lat, draft.lng)) return null; return { circleId, citySlug:'perm', categorySlug:draft.categorySlug, direction:draft.direction, changeType:draft.changeType, lat:draft.lat!, lng:draft.lng!, radiusM:1000, days:14 }; }
export function mapSimilarSearchError(error: unknown) { const msg = error instanceof Error ? error.message : String(error ?? ''); if (msg.includes('not_circle_member') || msg.includes('not_authenticated')) return 'Нужно войти в круг, чтобы проверить похожие Дельты.'; return 'Не удалось проверить похожие Дельты'; }
