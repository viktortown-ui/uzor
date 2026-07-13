import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { PERM_FALLBACK } from '../../deltaMap/deltaMapLogic';
import { isWithinPermMvpArea, PERM_MVP_AREA_ERROR } from '../deltaGeoLogic';

const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

export function MobileDeltaMapPicker({ lat, lng, onPick }: { lat: number | null; lng: number | null; onPick: (lat:number,lng:number, source:'map'|'geolocation')=>void }) {
  const el = useRef<HTMLDivElement|null>(null); const mapRef = useRef<maplibregl.Map|null>(null); const markerRef = useRef<maplibregl.Marker|null>(null); const pickRef = useRef(onPick); const coordsRef = useRef({lat,lng}); const [error,setError]=useState(''); const [retry,setRetry]=useState(0);
  useEffect(()=>{ pickRef.current=onPick; coordsRef.current={lat,lng}; },[onPick,lat,lng]);
  useEffect(()=>{ if(!el.current || mapRef.current) return; let map: maplibregl.Map; try { map = new maplibregl.Map({ container: el.current, style: styleUrl, center: [coordsRef.current.lng ?? PERM_FALLBACK.lng, coordsRef.current.lat ?? PERM_FALLBACK.lat], zoom: coordsRef.current.lat ? 13 : 11.5, attributionControl: { compact: true } }); } catch { window.setTimeout(() => setError('Не удалось открыть карту'), 0); return; } mapRef.current=map; map.addControl(new maplibregl.NavigationControl({visualizePitch:false}), 'bottom-right'); map.on('click',(e)=>pickRef.current(e.lngLat.lat,e.lngLat.lng,'map')); map.on('error',()=>setError('Не удалось открыть карту')); return()=>{ markerRef.current?.remove(); markerRef.current=null; map.remove(); mapRef.current=null; }; },[retry]);
  useEffect(()=>{ const map=mapRef.current; if(!map||lat==null||lng==null) return; if(!markerRef.current) markerRef.current=new maplibregl.Marker().addTo(map); markerRef.current.setLngLat([lng,lat]); map.flyTo({center:[lng,lat],zoom:13,essential:false}); },[lat,lng]);
  const geo=()=>{ setError(''); if(!navigator.geolocation){setError('Доступ к местоположению не предоставлен. Выберите точку на карте.');return;} navigator.geolocation.getCurrentPosition(p=>{ if(!isWithinPermMvpArea(p.coords.latitude,p.coords.longitude)){setError(PERM_MVP_AREA_ERROR);return;} pickRef.current(p.coords.latitude,p.coords.longitude,'geolocation'); },()=>setError('Доступ к местоположению не предоставлен. Выберите точку на карте.'),{timeout:10000,enableHighAccuracy:false}); };
  return <div className="mobile-delta-map-wrap"><div ref={el} className="mobile-delta-map" role="application" aria-label="Карта выбора места Дельты" />{error&&<div className="mobile-delta-map-error" role="alert"><p>{error}</p><button type="button" onClick={()=>{setError(''); markerRef.current?.remove(); mapRef.current?.remove(); mapRef.current=null; setRetry(x=>x+1);}}>Повторить</button></div>}<button className="mobile-delta-locate" type="button" onClick={geo} aria-label="Выбрать моё местоположение">◎</button></div>;
}
