import { SearchBox } from '@mapbox/search-js-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { createDeltaMarkerElement } from './DeltaMarker';
import { PERM_FALLBACK } from './deltaMapLogic';

type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };
type CityCenter = { lat: number; lng: number; zoom: number };
const styleUrl = import.meta.env.VITE_MAPBOX_STYLE_URL || 'mapbox://styles/mapbox/dark-v11';
function boundsFromMap(map: mapboxgl.Map): Bounds { const b = map.getBounds(); if (!b) return { minLat: PERM_FALLBACK.lat - 0.2, minLng: PERM_FALLBACK.lng - 0.2, maxLat: PERM_FALLBACK.lat + 0.2, maxLng: PERM_FALLBACK.lng + 0.2 }; return { minLat: b.getSouth(), minLng: b.getWest(), maxLat: b.getNorth(), maxLng: b.getEast() }; }
export function DeltaMapCanvas({ token, city = PERM_FALLBACK, deltas, highlightedId, onViewport, onSelect, onResetPerm }: { token: string; city?: CityCenter; deltas: DeltaMapItem[]; selectedId?: string | null; highlightedId?: string | null; onViewport:(b:Bounds)=>void; onSelect:(d:DeltaMapItem)=>void; onResetPerm?:()=>void }) {
 const containerRef = useRef<HTMLDivElement | null>(null); const mapRef = useRef<mapboxgl.Map | null>(null); const markersRef = useRef<mapboxgl.Marker[]>([]); const timerRef = useRef<number | null>(null); const [mapReady,setMapReady]=useState(false); const [mapInstance,setMapInstance]=useState<mapboxgl.Map | null>(null);
 useEffect(()=>{ if (!containerRef.current || mapRef.current) return; mapboxgl.accessToken = token; const map = new mapboxgl.Map({ container: containerRef.current, style: styleUrl, center:[city.lng, city.lat], zoom: city.zoom, attributionControl:true }); mapRef.current = map; setMapInstance(map); map.addControl(new mapboxgl.NavigationControl({ visualizePitch:false }), 'bottom-right'); if ('geolocation' in navigator) map.addControl(new mapboxgl.GeolocateControl({ positionOptions:{ enableHighAccuracy:false }, trackUserLocation:false, showUserHeading:false }), 'bottom-right'); map.on('load',()=>{ setMapReady(true); onViewport(boundsFromMap(map)); }); map.on('moveend',()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(()=>onViewport(boundsFromMap(map)),350); }); return ()=>{ if (timerRef.current) window.clearTimeout(timerRef.current); markersRef.current.forEach(m=>m.remove()); map.remove(); mapRef.current=null; setMapInstance(null); }; },[token,city.lat,city.lng,city.zoom,onViewport]);
 useEffect(()=>{ if (!mapReady || !mapRef.current) return; markersRef.current.forEach(m=>m.remove()); markersRef.current = deltas.map((delta)=> new mapboxgl.Marker({ element:createDeltaMarkerElement(delta,onSelect, highlightedId===delta.id), anchor:'center' }).setLngLat([delta.location.lng, delta.location.lat]).addTo(mapRef.current!)); },[deltas,mapReady,onSelect,highlightedId]);
 useEffect(()=>{ if (!mapRef.current) return; mapRef.current.flyTo({ center:[city.lng, city.lat], zoom:city.zoom, essential:false }); },[city.lat,city.lng,city.zoom]);
 return <div className="delta-map-canvas"><div className="delta-map-search">{mapReady && mapInstance ? <SearchBox accessToken={token} map={mapInstance as never} mapboxgl={mapboxgl as never} placeholder="Район, улица или место" options={{ language: 'ru', country: 'RU', types: 'address,street,place,poi', proximity: [city.lng, city.lat] }} /> : <span>Поиск появится после загрузки карты</span>}</div><div ref={containerRef} className="delta-mapbox" /><button className="delta-map-reset" onClick={onResetPerm}>К центру Перми</button></div>;
}
