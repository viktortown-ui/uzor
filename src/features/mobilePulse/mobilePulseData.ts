import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getDeltaCard, listDeltasInView, loadDeltaCities } from '../deltas/deltaApi';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { demoCard, demoDeltaMapData } from '../deltaMap/demoDeltaMapData';
import { buildViewportInput, loadDeltaMapContext, PERM_FALLBACK, shouldShowDeltaOnMap } from '../deltaMap/deltaMapLogic';
import { boundsFromCenterRadius, PERM_FALLBACK_RADIUS_M, PULSE_FEED_LIMIT, sortCityItems, sortNearbyMapItems, summarizePulse, toPulseItem } from './mobilePulseLogic';
import type { MobilePulseData, MobilePulseItem } from './mobilePulseTypes';

export class MobilePulseJoinError extends Error {}
async function hydrateSelected(rows: DeltaMapItem[]): Promise<MobilePulseItem[]> {
  const cards = await Promise.allSettled(rows.map((item) => isDemoMode ? Promise.resolve(demoCard(item.id)) : getDeltaCard(item.id)));
  return rows.map((item, index) => toPulseItem(item, cards[index].status === 'fulfilled' ? cards[index].value : null));
}
export function buildCityPulseItems(rows: DeltaMapItem[]) { return hydrateSelected(sortCityItems(rows).slice(0, PULSE_FEED_LIMIT)); }
export async function buildNearbyPulseItems(rows: DeltaMapItem[], lat: number, lng: number) {
  const selected = sortNearbyMapItems(rows, lat, lng).slice(0, PULSE_FEED_LIMIT);
  const hydrated = await hydrateSelected(selected);
  return hydrated.map((item, index) => ({ ...item, distanceMeters: selected[index].distanceMeters }));
}
export async function loadMobilePulseData(now = new Date()): Promise<MobilePulseData> {
  let rows: DeltaMapItem[];
  if (isDemoMode) rows = demoDeltaMapData.filter(shouldShowDeltaOnMap);
  else {
    if (!isProductionConfigured) throw new Error('production_not_configured');
    const context = await loadDeltaMapContext();
    if (!context) throw new MobilePulseJoinError();
    const city = (await loadDeltaCities()).find((value) => value.slug === 'perm');
    const centerLat = Number.isFinite(city?.centerLat) ? city!.centerLat : PERM_FALLBACK.lat;
    const centerLng = Number.isFinite(city?.centerLng) ? city!.centerLng : PERM_FALLBACK.lng;
    const radius = city && Number.isFinite(city.outskirtsDistanceM) && city.outskirtsDistanceM > 0 ? city.outskirtsDistanceM : PERM_FALLBACK_RADIUS_M;
    rows = (await listDeltasInView(buildViewportInput(context, boundsFromCenterRadius(centerLat, centerLng, radius), { direction:'all', status:'all', categorySlug:'all' }))).filter(shouldShowDeltaOnMap);
  }
  return { summary:summarizePulse(rows, now), items:await buildCityPulseItems(rows), allItems:rows, loadedAt:new Date() };
}
