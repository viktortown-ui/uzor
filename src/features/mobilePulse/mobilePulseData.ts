import { isDemoMode, isProductionConfigured } from '../../app/appMode';
import { getDeltaCard, listDeltasInView, loadDeltaCities } from '../deltas/deltaApi';
import { demoCard, demoDeltaMapData } from '../deltaMap/demoDeltaMapData';
import { buildViewportInput, loadDeltaMapContext, PERM_FALLBACK, shouldShowDeltaOnMap } from '../deltaMap/deltaMapLogic';
import { boundsFromCenterRadius, PERM_FALLBACK_RADIUS_M, PULSE_FEED_LIMIT, sortCityItems, summarizePulse, toPulseItem } from './mobilePulseLogic';
import type { MobilePulseData } from './mobilePulseTypes';

export class MobilePulseJoinError extends Error {}
export async function loadMobilePulseData(now = new Date()): Promise<MobilePulseData> {
  if (isDemoMode) { const visible=demoDeltaMapData.filter(shouldShowDeltaOnMap); const selected=sortCityItems(visible).slice(0,PULSE_FEED_LIMIT); return { summary:summarizePulse(visible,now), items:selected.map(item=>toPulseItem(item,demoCard(item.id))), allItems:visible, loadedAt:new Date() }; }
  if (!isProductionConfigured) throw new Error('production_not_configured');
  const context=await loadDeltaMapContext();
  if (!context) throw new MobilePulseJoinError();
  const cities=await loadDeltaCities();
  const city=cities.find(value=>value.slug==='perm');
  const centerLat=Number.isFinite(city?.centerLat) ? city!.centerLat : PERM_FALLBACK.lat;
  const centerLng=Number.isFinite(city?.centerLng) ? city!.centerLng : PERM_FALLBACK.lng;
  const radius=city && Number.isFinite(city.outskirtsDistanceM) && city.outskirtsDistanceM>0 ? city.outskirtsDistanceM : PERM_FALLBACK_RADIUS_M;
  const rows=(await listDeltasInView(buildViewportInput(context,boundsFromCenterRadius(centerLat,centerLng,radius),{direction:'all',status:'all',categorySlug:'all'}))).filter(shouldShowDeltaOnMap);
  const selected=sortCityItems(rows).slice(0,PULSE_FEED_LIMIT);
  const cards=await Promise.allSettled(selected.map(item=>getDeltaCard(item.id)));
  return { summary:summarizePulse(rows,now), items:selected.map((item,index)=>toPulseItem(item,cards[index].status==='fulfilled'?cards[index].value:null)), allItems:rows, loadedAt:new Date() };
}
