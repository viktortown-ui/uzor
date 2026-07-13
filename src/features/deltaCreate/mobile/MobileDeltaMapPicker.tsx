import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PERM_FALLBACK } from '../../deltaMap/deltaMapLogic';
import { isWithinPermMvpArea, PERM_MVP_AREA_ERROR } from '../deltaGeoLogic';

const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';

type Source = 'map' | 'geolocation';

type Props = {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number, source: Source) => void;
};

export function MobileDeltaMapPicker({ lat, lng, onPick }: Props) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const pickRef = useRef(onPick);
  const coordsRef = useRef({ lat, lng });
  const mountedRef = useRef(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const safeSetError = useCallback((message: string) => {
    if (mountedRef.current) setError(message);
  }, []);

  const destroyMap = useCallback(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    markerRef.current = null;
    mapRef.current = null;
    marker?.remove();
    map?.remove();
  }, []);

  const choosePoint = useCallback((nextLat: number, nextLng: number, source: Source) => {
    if (!isWithinPermMvpArea(nextLat, nextLng)) {
      safeSetError(PERM_MVP_AREA_ERROR);
      return;
    }
    safeSetError('');
    pickRef.current(nextLat, nextLng, source);
  }, [safeSetError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    pickRef.current = onPick;
    coordsRef.current = { lat, lng };
  }, [onPick, lat, lng]);

  useEffect(() => {
    if (!el.current || mapRef.current) return undefined;

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: el.current,
        style: styleUrl,
        center: [coordsRef.current.lng ?? PERM_FALLBACK.lng, coordsRef.current.lat ?? PERM_FALLBACK.lat],
        zoom: coordsRef.current.lat ? 13 : 11.5,
        attributionControl: { compact: true },
      });
    } catch {
      window.setTimeout(() => safeSetError('Не удалось открыть карту'), 0);
      return undefined;
    }

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
    map.on('click', (event) => choosePoint(event.lngLat.lat, event.lngLat.lng, 'map'));
    map.on('error', (event) => {
      const maybeError = event as { error?: { message?: string } };
      if (/style|load|sprite|glyph/i.test(maybeError.error?.message ?? '')) {
        safeSetError('Не удалось открыть карту');
      }
    });

    return destroyMap;
  }, [choosePoint, destroyMap, retry, safeSetError]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || lat == null || lng == null) return;
    if (!markerRef.current) markerRef.current = new maplibregl.Marker().addTo(map);
    markerRef.current.setLngLat([lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: 13, essential: false });
  }, [lat, lng]);

  const geolocate = () => {
    safeSetError('');
    if (!navigator.geolocation) {
      safeSetError('Доступ к местоположению не предоставлен. Выберите точку на карте.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => choosePoint(position.coords.latitude, position.coords.longitude, 'geolocation'),
      () => safeSetError('Доступ к местоположению не предоставлен. Выберите точку на карте.'),
      { timeout: 10000, enableHighAccuracy: false },
    );
  };

  const retryMap = () => {
    safeSetError('');
    destroyMap();
    setRetry((value) => value + 1);
  };

  return (
    <div className="mobile-delta-map-wrap">
      <div ref={el} className="mobile-delta-map" role="application" aria-label="Карта выбора места Дельты" />
      {error && (
        <div className="mobile-delta-map-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={retryMap}>Повторить</button>
        </div>
      )}
      <button className="mobile-delta-locate" type="button" onClick={geolocate} aria-label="Выбрать моё местоположение">◎</button>
    </div>
  );
}
