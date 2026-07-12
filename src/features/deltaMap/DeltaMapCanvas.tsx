import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useCallback, useRef, useState } from 'react';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { createDeltaMarkerElement } from './DeltaMarker';
import { PERM_FALLBACK } from './deltaMapLogic';

type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };
type CityCenter = { lat: number; lng: number; zoom: number };
const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
function boundsFromMap(map: maplibregl.Map): Bounds { const b = map.getBounds(); if (!b) return { minLat: PERM_FALLBACK.lat - 0.2, minLng: PERM_FALLBACK.lng - 0.2, maxLat: PERM_FALLBACK.lat + 0.2, maxLng: PERM_FALLBACK.lng + 0.2 }; return { minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() }; }

export function DeltaMapCanvas({ city = PERM_FALLBACK, deltas, highlightedId, onViewport, onSelect, onResetPerm, permResetKey = 0 }: { city?: CityCenter; deltas: DeltaMapItem[]; selectedId?: string | null; highlightedId?: string | null; onViewport:(b:Bounds)=>void; onSelect:(d:DeltaMapItem)=>void; onResetPerm?:()=>void; permResetKey?: number }) {
 const containerRef = useRef<HTMLDivElement | null>(null); const mapRef = useRef<maplibregl.Map | null>(null); const markersRef = useRef<maplibregl.Marker[]>([]); const timerRef = useRef<number | null>(null); const onViewportRef = useRef(onViewport); const onSelectRef = useRef(onSelect); const initialCityRef = useRef(city); const [mapReady,setMapReady]=useState(false); const [mapError,setMapError]=useState(false); const [retryKey,setRetryKey]=useState(0);
 useEffect(()=>{ onViewportRef.current = onViewport; },[onViewport]);
 useEffect(()=>{ onSelectRef.current = onSelect; },[onSelect]);
 useEffect(()=>{ if (!containerRef.current || mapRef.current) return; let map: maplibregl.Map; const initialCity = initialCityRef.current; try { map = new maplibregl.Map({ container: containerRef.current, style: styleUrl, center:[initialCity.lng, initialCity.lat], zoom: initialCity.zoom, attributionControl:{} }); } catch { window.setTimeout(()=>setMapError(true),0); return; } mapRef.current = map; map.addControl(new maplibregl.NavigationControl({ visualizePitch:false }), 'bottom-right'); if ('geolocation' in navigator) map.addControl(new maplibregl.GeolocateControl({ positionOptions:{ enableHighAccuracy:false }, trackUserLocation:false }), 'bottom-right'); map.on('load',()=>{ setMapReady(true); onViewportRef.current(boundsFromMap(map)); }); map.on('error',()=>setMapError(true)); map.on('moveend',()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(()=>onViewportRef.current(boundsFromMap(map)),350); }); return ()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); markersRef.current.forEach(m=>m.remove()); markersRef.current=[]; map.remove(); mapRef.current=null; setMapReady(false); }; },[retryKey]);
 useEffect(()=>{ if (!mapReady || !mapRef.current) return; markersRef.current.forEach(m=>m.remove()); markersRef.current = deltas.map((delta)=> new maplibregl.Marker({ element:createDeltaMarkerElement(delta,(selected)=>onSelectRef.current(selected), highlightedId===delta.id), anchor:'center' }).setLngLat([delta.location.lng, delta.location.lat]).addTo(mapRef.current!)); },[deltas,mapReady,highlightedId]);
 useEffect(()=>{ if (!mapRef.current || !mapReady) return; mapRef.current.flyTo({ center:[city.lng, city.lat], zoom:city.zoom, essential:false }); },[city.lat,city.lng,city.zoom,mapReady]);
 useEffect(()=>{ if (!mapRef.current || !mapReady || permResetKey===0) return; mapRef.current.flyTo({ center:[PERM_FALLBACK.lng, PERM_FALLBACK.lat], zoom:PERM_FALLBACK.zoom, essential:false }); },[permResetKey,mapReady]);
 const resetToPerm=useCallback(()=>{ if (onResetPerm) { onResetPerm(); return; } mapRef.current?.flyTo({ center:[PERM_FALLBACK.lng, PERM_FALLBACK.lat], zoom:PERM_FALLBACK.zoom, essential:false }); },[onResetPerm]);
 const retry=()=>{ setMapError(false); setMapReady(false); setRetryKey(k=>k+1); };
 return <div className="delta-map-canvas"><div ref={containerRef} className="delta-map-surface" />{mapError&&<div className="delta-map-local-error" role="alert"><h2>Не удалось открыть карту</h2><p>Проверьте соединение или попробуйте ещё раз.</p><button className="delta-map-button" onClick={retry}>Повторить</button></div>}<button className="delta-map-reset" onClick={resetToPerm}>К центру Перми</button></div>;
}
