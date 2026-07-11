import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { createDeltaMarkerElement } from './DeltaMarker';
import { PERM_FALLBACK } from './deltaMapLogic';

type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };
type CityCenter = { lat: number; lng: number; zoom: number };
const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
function boundsFromMap(map: maplibregl.Map): Bounds { const b = map.getBounds(); if (!b) return { minLat: PERM_FALLBACK.lat - 0.2, minLng: PERM_FALLBACK.lng - 0.2, maxLat: PERM_FALLBACK.lat + 0.2, maxLng: PERM_FALLBACK.lng + 0.2 }; return { minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() }; }

export function DeltaMapCanvas({ city = PERM_FALLBACK, deltas, highlightedId, onViewport, onSelect, onResetPerm }: { city?: CityCenter; deltas: DeltaMapItem[]; selectedId?: string | null; highlightedId?: string | null; onViewport:(b:Bounds)=>void; onSelect:(d:DeltaMapItem)=>void; onResetPerm?:()=>void }) {
 const containerRef = useRef<HTMLDivElement | null>(null); const mapRef = useRef<maplibregl.Map | null>(null); const markersRef = useRef<maplibregl.Marker[]>([]); const timerRef = useRef<number | null>(null); const [mapReady,setMapReady]=useState(false); const [mapError,setMapError]=useState(false); const [retryKey,setRetryKey]=useState(0);
 useEffect(()=>{ if (!containerRef.current || mapRef.current) return; let map: maplibregl.Map; try { map = new maplibregl.Map({ container: containerRef.current, style: styleUrl, center:[city.lng, city.lat], zoom: city.zoom, attributionControl:{} }); } catch { window.setTimeout(()=>setMapError(true),0); return; } mapRef.current = map; map.addControl(new maplibregl.NavigationControl({ visualizePitch:false }), 'bottom-right'); if ('geolocation' in navigator) map.addControl(new maplibregl.GeolocateControl({ positionOptions:{ enableHighAccuracy:false }, trackUserLocation:false }), 'bottom-right'); map.on('load',()=>{ setMapReady(true); onViewport(boundsFromMap(map)); }); map.on('error',()=>setMapError(true)); map.on('moveend',()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(()=>onViewport(boundsFromMap(map)),350); }); return ()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); markersRef.current.forEach(m=>m.remove()); map.remove(); mapRef.current=null; }; },[city.lat,city.lng,city.zoom,onViewport,retryKey]);
 useEffect(()=>{ if (!mapReady || !mapRef.current) return; markersRef.current.forEach(m=>m.remove()); markersRef.current = deltas.map((delta)=> new maplibregl.Marker({ element:createDeltaMarkerElement(delta,onSelect, highlightedId===delta.id), anchor:'center' }).setLngLat([delta.location.lng, delta.location.lat]).addTo(mapRef.current!)); },[deltas,mapReady,onSelect,highlightedId]);
 useEffect(()=>{ if (!mapRef.current) return; mapRef.current.flyTo({ center:[city.lng, city.lat], zoom:city.zoom, essential:false }); },[city.lat,city.lng,city.zoom]);
 const retry=()=>{ setMapError(false); setMapReady(false); markersRef.current.forEach(m=>m.remove()); mapRef.current?.remove(); mapRef.current=null; setRetryKey(k=>k+1); };
 return <div className="delta-map-canvas"><div ref={containerRef} className="delta-map-surface" />{mapError&&<div className="delta-map-local-error" role="alert"><h2>Не удалось открыть карту</h2><p>Проверьте соединение или попробуйте ещё раз.</p><button className="delta-map-button" onClick={retry}>Повторить</button></div>}<button className="delta-map-reset" onClick={onResetPerm}>К центру Перми</button></div>;
}
