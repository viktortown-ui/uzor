import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PERM_FALLBACK } from '../../deltaMap/deltaMapLogic';
import { isFatalMapLibreError } from '../../maps/mapLibreErrorPolicy';
import { isWithinPermMvpArea, PERM_MVP_AREA_ERROR } from '../deltaGeoLogic';

const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

type Source = 'map' | 'geolocation';
type Props = { lat: number | null; lng: number | null; onPick: (lat: number, lng: number, source: Source) => void };

export function MobileDeltaMapPicker({ lat, lng, onPick }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);
  const pickRef = useRef(onPick);
  const coordsRef = useRef({ lat, lng });
  const mountedRef = useRef(false);
  const usableMapRef = useRef(false);
  const [error, setError] = useState('');
  const [fatalError, setFatalError] = useState(false);
  const [retry, setRetry] = useState(0);

  const safeSetError = useCallback((message: string, fatal = false) => { if (mountedRef.current) { setError(message); setFatalError(fatal); } }, []);
  const failMap = useCallback(() => safeSetError('Не удалось открыть карту', true), [safeSetError]);
  const warnMap = useCallback((message: string) => safeSetError(message, false), [safeSetError]);

  const destroyMap = useCallback(() => {
    const cleanups = cleanupRef.current.splice(0);
    cleanups.forEach((cleanup) => { try { cleanup(); } catch { /* noop */ } });
    const marker = markerRef.current;
    const map = mapRef.current;
    markerRef.current = null;
    mapRef.current = null;
    usableMapRef.current = false;
    try { marker?.remove(); } catch { /* noop */ }
    try { map?.remove(); } catch { /* noop */ }
  }, []);

  const choosePoint = useCallback((nextLat: number, nextLng: number, source: Source) => {
    if (!isWithinPermMvpArea(nextLat, nextLng)) { warnMap(PERM_MVP_AREA_ERROR); return; }
    safeSetError('');
    pickRef.current(nextLat, nextLng, source);
  }, [safeSetError, warnMap]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { pickRef.current = onPick; coordsRef.current = { lat, lng }; }, [onPick, lat, lng]);

  useEffect(() => {
    if (!el.current || mapRef.current) return undefined;
    let map: maplibregl.Map | null = null;
    const guard = (fn: () => void) => { try { fn(); } catch { failMap(); destroyMap(); } };
    try {
      map = new maplibregl.Map({ container: el.current, style: styleUrl, center: [coordsRef.current.lng ?? PERM_FALLBACK.lng, coordsRef.current.lat ?? PERM_FALLBACK.lat], zoom: coordsRef.current.lat ? 13 : 11.5, attributionControl: { compact: true } });
      mapRef.current = map;
      const nav = new maplibregl.NavigationControl({ visualizePitch: false });
      map.addControl(nav, 'bottom-right');
      const clickHandler = (event: maplibregl.MapMouseEvent) => choosePoint(event.lngLat.lat, event.lngLat.lng, 'map');
      const loadHandler = () => guard(() => { if (map && typeof map.resize === 'function') map.resize(); usableMapRef.current = true; });
      const errorHandler = (event?: maplibregl.ErrorEvent) => {
        if (isFatalMapLibreError(event, usableMapRef.current)) failMap();
      };
      map.on('click', clickHandler);
      map.on('load', loadHandler);
      map.on('error', errorHandler);
      cleanupRef.current.push(() => map?.off('click', clickHandler), () => map?.off('load', loadHandler), () => map?.off('error', errorHandler));
      const frame = window.requestAnimationFrame(() => guard(() => map && typeof map.resize === 'function' && map.resize()));
      cleanupRef.current.push(() => window.cancelAnimationFrame(frame));
      if ('ResizeObserver' in window && el.current) {
        const observer = new ResizeObserver(() => guard(() => map && typeof map.resize === 'function' && map.resize()));
        observer.observe(el.current);
        cleanupRef.current.push(() => observer.disconnect());
      }
      const viewport = window.visualViewport;
      if (viewport) {
        const resize = () => guard(() => map && typeof map.resize === 'function' && map.resize());
        viewport.addEventListener('resize', resize);
        viewport.addEventListener('scroll', resize);
        cleanupRef.current.push(() => viewport.removeEventListener('resize', resize), () => viewport.removeEventListener('scroll', resize));
      }
    } catch {
      failMap();
      destroyMap();
      return undefined;
    }
    return destroyMap;
  }, [choosePoint, destroyMap, failMap, retry]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null || fatalError) return;
    try {
      if (!markerRef.current) markerRef.current = new maplibregl.Marker().addTo(map);
      markerRef.current.setLngLat([lng, lat]);
      map.flyTo({ center: [lng, lat], zoom: 13, essential: false });
    } catch { failMap(); destroyMap(); }
  }, [lat, lng, fatalError, failMap, destroyMap]);

  const geolocate = () => { safeSetError(''); if (!navigator.geolocation) { warnMap('Доступ к местоположению не предоставлен. Выберите точку на карте.'); return; } navigator.geolocation.getCurrentPosition((position) => choosePoint(position.coords.latitude, position.coords.longitude, 'geolocation'), () => warnMap('Доступ к местоположению не предоставлен. Выберите точку на карте.'), { timeout: 10000, enableHighAccuracy: false }); };
  const retryMap = () => { safeSetError(''); destroyMap(); setRetry((value) => value + 1); };

  return <div className="mobile-delta-map-wrap"><div ref={el} className="mobile-delta-map" role="application" aria-label="Карта выбора места Дельты" />{error && <div className="mobile-delta-map-error" role="alert"><p>{error}</p>{fatalError && <button type="button" onClick={retryMap}>Повторить</button>}</div>}<button className="mobile-delta-locate" type="button" onClick={geolocate} aria-label="Выбрать моё местоположение">◎</button></div>;
}
