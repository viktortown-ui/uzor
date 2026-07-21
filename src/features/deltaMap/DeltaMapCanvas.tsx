import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { isFatalMapLibreError } from '../maps/mapLibreErrorPolicy';
import { createDeltaMarkerElement } from './DeltaMarker';
import { PERM_FALLBACK } from './deltaMapLogic';

type Bounds = { minLat: number; minLng: number; maxLat: number; maxLng: number };
type CityCenter = { lat: number; lng: number; zoom: number };
type DeltaProperties = {
  id: string;
  direction: string;
  status: string;
  category: string;
  confirmationCount: number;
  positive: number;
  negative: number;
  visualKey: string;
};
type DeltaGeoJson = GeoJSON.FeatureCollection<GeoJSON.Point, DeltaProperties>;
type Props = {
  city?: CityCenter;
  deltas: DeltaMapItem[];
  selectedId?: string | null;
  highlightedId?: string | null;
  onViewport: (bounds: Bounds) => void;
  onSelect: (delta: DeltaMapItem) => void;
  onResetPerm?: () => void;
  permResetKey?: number;
  onInteraction?: () => void;
};

const styleUrl = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
export const DELTA_SOURCE_ID = 'delta-cluster-source';
export const DELTA_CLUSTER_LAYER_ID = 'delta-clusters';
export const DELTA_CLUSTER_COUNT_LAYER_ID = 'delta-cluster-count';
export const DELTA_POINT_LAYER_ID = 'delta-unclustered-points';
export const DELTA_MOBILE_FLAG_LAYER_ID = 'delta-mobile-flags';
export const DELTA_MOBILE_FLAG_HIT_LAYER_ID = 'delta-mobile-flag-hit';
export const DELTA_CLUSTER_MAX_ZOOM = 12;
export const DELTA_DOM_MARKER_MIN_ZOOM = DELTA_CLUSTER_MAX_ZOOM + 1;

function deltaVisualKey(delta: DeltaMapItem): string {
  return `delta-flag-${delta.direction}-${delta.status === 'fork' ? 'fork' : delta.status}`;
}

function createFlagImage(key: string): { width: number; height: number; data: Uint8ClampedArray } {
  const width = 44; const height = 52;
  const data = new Uint8ClampedArray(width * height * 4);
  const negative = key.includes('negative');
  const fork = key.includes('fork');
  const checking = key.includes('checking');
  const confirmed = key.includes('confirmed');
  const fill = negative ? [251, 125, 83] : [45, 212, 191];
  const stroke = fork ? [124, 108, 242] : checking ? [250, 204, 21] : confirmed ? [236, 254, 255] : [7, 16, 31];
  const set = (x: number, y: number, c: number[]) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i = (y * width + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3] ?? 255; };
  for (let y = 4; y < 38; y += 1) for (let x = 6; x < 38; x += 1) {
    const dx = x - 22; const dy = y - 20; if (dx * dx / 256 + dy * dy / 196 <= 1) set(x, y, [...fill, 255]);
  }
  for (let y = 39; y < 52; y += 1) for (let x = 18; x < 26; x += 1) if (Math.abs(x - 22) <= (52 - y) / 2) set(x, y, [...fill, 255]);
  for (let y = 8; y < 34; y += 1) { set(11, y, stroke); set(33, y, stroke); }
  for (let x = 12; x < 33; x += 1) { set(x, 8, stroke); set(x, 33, stroke); }
  if (fork) for (let i = 0; i < 18; i += 1) { set(13 + i, 15 + i, stroke); set(31 - i, 15 + i, stroke); }
  return { width, height, data };
}

function geoJson(deltas: DeltaMapItem[]): DeltaGeoJson {
  return {
    type: 'FeatureCollection',
    features: deltas.map((delta) => ({
      type: 'Feature',
      id: delta.id,
      geometry: { type: 'Point', coordinates: [delta.location.lng, delta.location.lat] },
      properties: {
        id: delta.id,
        direction: delta.direction,
        status: delta.status,
        category: delta.category.slug,
        confirmationCount: delta.confirmCount,
        positive: delta.direction === 'positive' ? 1 : 0,
        negative: delta.direction === 'negative' ? 1 : 0,
        visualKey: deltaVisualKey(delta),
      },
    })),
  };
}

function boundsFromMap(map: maplibregl.Map): Bounds {
  const bounds = map.getBounds();
  return bounds
    ? { minLat: bounds.getSouth(), minLng: bounds.getWest(), maxLat: bounds.getNorth(), maxLng: bounds.getEast() }
    : { minLat: PERM_FALLBACK.lat - 0.2, minLng: PERM_FALLBACK.lng - 0.2, maxLat: PERM_FALLBACK.lat + 0.2, maxLng: PERM_FALLBACK.lng + 0.2 };
}

export function DeltaMapCanvas({
  city = PERM_FALLBACK,
  deltas,
  highlightedId,
  onViewport,
  onSelect,
  onResetPerm,
  permResetKey = 0,
  onInteraction,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const timerRef = useRef<number | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const usableMapRef = useRef(false);
  const programmaticRef = useRef(false);
  const onViewportRef = useRef(onViewport);
  const onSelectRef = useRef(onSelect);
  const onInteractionRef = useRef(onInteraction);
  const deltasRef = useRef(deltas);
  const initialCityRef = useRef(city);
  const [mapReady, setMapReady] = useState(false);
  const [showDomMarkers, setShowDomMarkers] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) : false);
  const [mapError, setMapError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => { onViewportRef.current = onViewport; }, [onViewport]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onInteractionRef.current = onInteraction; }, [onInteraction]);
  useEffect(() => { deltasRef.current = deltas; }, [deltas]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    let map: maplibregl.Map | null = null;
    let removed = false;
    const cleanups: Array<() => void> = [];
    const fatal = () => setMapError(true);

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: styleUrl,
        center: [initialCityRef.current.lng, initialCityRef.current.lat],
        zoom: initialCityRef.current.zoom,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
      if ('geolocation' in navigator) {
        map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), 'bottom-right');
      }

      const updateZoom = () => {
        const zoom = typeof map?.getZoom === 'function' ? map.getZoom() : DELTA_DOM_MARKER_MIN_ZOOM;
        const mobile = (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches);
        setIsMobile(mobile);
        setShowDomMarkers(!mobile && zoom >= DELTA_DOM_MARKER_MIN_ZOOM);
      };
      const registerMobileFlagImages = () => {
        if (!map) return;
        const keys = new Set(deltasRef.current.map(deltaVisualKey));
        for (const key of keys) {
          const hasImage = typeof (map as unknown as { hasImage?: (id: string) => boolean }).hasImage === 'function' && (map as unknown as { hasImage: (id: string) => boolean }).hasImage(key);
          if (!hasImage && typeof (map as unknown as { addImage?: (id: string, image: { width: number; height: number; data: Uint8ClampedArray }, options?: { pixelRatio: number }) => void }).addImage === 'function') (map as unknown as { addImage: (id: string, image: { width: number; height: number; data: Uint8ClampedArray }, options?: { pixelRatio: number }) => void }).addImage(key, createFlagImage(key), { pixelRatio: 1 });
        }
      };
      const setLayoutVisibility = (id: string, visibility: 'visible' | 'none') => { if (typeof (map as unknown as { setLayoutProperty?: (layer: string, name: string, value: string) => void }).setLayoutProperty === 'function') (map as unknown as { setLayoutProperty: (layer: string, name: string, value: string) => void }).setLayoutProperty(id, 'visibility', visibility); };
      const applyMobileLayerVisibility = () => {
        if (!map) return; const visible = (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) ? 'visible' : 'none';
        for (const id of [DELTA_MOBILE_FLAG_LAYER_ID, DELTA_MOBILE_FLAG_HIT_LAYER_ID]) if (map.getLayer(id)) setLayoutVisibility(id, visible);
      };
      const scheduleResize = () => {
        if (resizeFrameRef.current != null) return;
        resizeFrameRef.current = window.requestAnimationFrame(() => {
          resizeFrameRef.current = null;
          try { map?.resize(); } catch { /* Mobile toolbar changes must not make the map fatal. */ }
        });
      };
      resizeFrameRef.current = window.requestAnimationFrame(() => { resizeFrameRef.current = null; try { map?.resize(); } catch { /* noop */ } });
      if ('ResizeObserver' in window && containerRef.current) {
        const observer = new ResizeObserver(scheduleResize);
        observer.observe(containerRef.current);
        cleanups.push(() => observer.disconnect());
      }
      window.visualViewport?.addEventListener('resize', scheduleResize);
      window.visualViewport?.addEventListener('scroll', scheduleResize);
      cleanups.push(() => { window.visualViewport?.removeEventListener('resize', scheduleResize); window.visualViewport?.removeEventListener('scroll', scheduleResize); });
      const breakpoint = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 900px)') : null;
      const breakpointChange = () => { updateZoom(); applyMobileLayerVisibility(); };
      breakpoint?.addEventListener?.('change', breakpointChange);
      cleanups.push(() => breakpoint?.removeEventListener?.('change', breakpointChange));
      const initialize = () => {
        try {
          if (!map) return;
          if (!map.getSource(DELTA_SOURCE_ID)) {
            map.addSource(DELTA_SOURCE_ID, {
              type: 'geojson',
              data: geoJson(deltasRef.current),
              cluster: true,
              clusterRadius: 52,
              clusterMaxZoom: DELTA_CLUSTER_MAX_ZOOM,
              clusterProperties: { positive: ['+', ['get', 'positive']], negative: ['+', ['get', 'negative']] },
            });
          }
          if (!map.getLayer(DELTA_CLUSTER_LAYER_ID)) {
            map.addLayer({
              id: DELTA_CLUSTER_LAYER_ID,
              type: 'circle',
              source: DELTA_SOURCE_ID,
              filter: ['has', 'point_count'],
              maxzoom: DELTA_DOM_MARKER_MIN_ZOOM,
              paint: {
                'circle-radius': ['step', ['get', 'point_count'], 18, 10, 23, 30, 28],
                'circle-color': ['case', ['==', ['get', 'negative'], 0], '#2dd4bf', ['==', ['get', 'positive'], 0], '#fb7d53', '#7c6cf2'],
                'circle-stroke-color': '#ecfeff',
                'circle-stroke-width': 2,
              },
            });
          }
          if (!map.getLayer(DELTA_CLUSTER_COUNT_LAYER_ID)) {
            map.addLayer({
              id: DELTA_CLUSTER_COUNT_LAYER_ID,
              type: 'symbol',
              source: DELTA_SOURCE_ID,
              filter: ['has', 'point_count'],
              maxzoom: DELTA_DOM_MARKER_MIN_ZOOM,
              layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
              paint: { 'text-color': '#07101f' },
            });
          }
          registerMobileFlagImages();
          if (!map.getLayer(DELTA_POINT_LAYER_ID)) {
            map.addLayer({
              id: DELTA_POINT_LAYER_ID,
              type: 'circle',
              source: DELTA_SOURCE_ID,
              filter: ['!', ['has', 'point_count']],
              maxzoom: DELTA_DOM_MARKER_MIN_ZOOM,
              paint: {
                'circle-radius': 8,
                'circle-color': ['match', ['get', 'direction'], 'positive', '#2dd4bf', '#fb7d53'],
                'circle-stroke-color': '#ecfeff',
                'circle-stroke-width': 2,
              },
            });
          }
          if (!map.getLayer(DELTA_MOBILE_FLAG_LAYER_ID)) {
            map.addLayer({ id: DELTA_MOBILE_FLAG_LAYER_ID, type: 'symbol', source: DELTA_SOURCE_ID, filter: ['!', ['has', 'point_count']], minzoom: DELTA_DOM_MARKER_MIN_ZOOM, layout: { 'icon-image': ['get', 'visualKey'], 'icon-anchor': 'bottom', 'icon-size': 1, 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'visibility': (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) ? 'visible' : 'none' } });
          }
          if (!map.getLayer(DELTA_MOBILE_FLAG_HIT_LAYER_ID)) {
            map.addLayer({ id: DELTA_MOBILE_FLAG_HIT_LAYER_ID, type: 'circle', source: DELTA_SOURCE_ID, filter: ['!', ['has', 'point_count']], minzoom: DELTA_DOM_MARKER_MIN_ZOOM, paint: { 'circle-radius': 22, 'circle-color': 'rgba(0,0,0,0)' }, layout: { 'visibility': (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches) ? 'visible' : 'none' } });
          }
          applyMobileLayerVisibility();
          usableMapRef.current = true;
          setMapReady(true);
          setMapError(false);
          updateZoom();
          onViewportRef.current(boundsFromMap(map));
        } catch { fatal(); }
      };
      const moveend = () => {
        programmaticRef.current = false;
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => map && onViewportRef.current(boundsFromMap(map)), 350);
      };
      const interaction = () => { if (!programmaticRef.current) onInteractionRef.current?.(); };
      const error = (event: maplibregl.ErrorEvent) => { if (isFatalMapLibreError(event, usableMapRef.current)) fatal(); };
      const clusterClick = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id;
        const coordinates = (feature?.geometry as GeoJSON.Point)?.coordinates;
        if (clusterId == null || !coordinates || !map) return;
        try {
          const source = map.getSource(DELTA_SOURCE_ID) as maplibregl.GeoJSONSource;
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            programmaticRef.current = true;
            map?.easeTo({ center: coordinates as [number, number], zoom });
          }).catch(() => undefined);
        } catch { /* Keep the usable map visible. */ }
      };
      const pointClick = (event: maplibregl.MapLayerMouseEvent) => {
        const id = String(event.features?.[0]?.properties?.id ?? '');
        const delta = deltasRef.current.find((item) => item.id === id);
        if (delta) onSelectRef.current(delta);
      };
      const listeners: unknown[][] = [
        ['load', initialize], ['style.load', initialize], ['error', error], ['moveend', moveend],
        ['zoom', updateZoom], ['dragstart', interaction], ['zoomstart', interaction],
        ['click', DELTA_CLUSTER_LAYER_ID, clusterClick], ['click', DELTA_POINT_LAYER_ID, pointClick], ['click', DELTA_MOBILE_FLAG_HIT_LAYER_ID, pointClick],
      ];
      for (const args of listeners) {
        (map.on as (...values: unknown[]) => unknown)(...args);
        cleanups.push(() => { try { (map?.off as (...values: unknown[]) => unknown)?.(...args); } catch { /* Idempotent cleanup. */ } });
      }
    } catch { fatal(); }

    return () => {
      if (removed) return;
      removed = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (resizeFrameRef.current != null) window.cancelAnimationFrame(resizeFrameRef.current);
      cleanups.forEach((cleanup) => cleanup());
      markersRef.current.forEach((marker) => { try { marker.remove(); } catch { /* noop */ } });
      markersRef.current = [];
      try { map?.remove(); } catch { /* noop */ }
      mapRef.current = null;
      usableMapRef.current = false;
    };
  }, [retryKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try { (mapRef.current.getSource(DELTA_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(geoJson(deltas)); }
    catch { window.setTimeout(() => setMapError(true), 0); }
  }, [deltas, mapReady]);

  useEffect(() => {
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (!mapReady || !showDomMarkers || isMobile || !mapRef.current) return undefined;
    markersRef.current = deltas.map((delta) => new maplibregl.Marker({
      element: createDeltaMarkerElement(delta, (item) => onSelectRef.current(item), highlightedId === delta.id),
      anchor: 'bottom',
    }).setLngLat([delta.location.lng, delta.location.lat]).addTo(mapRef.current!));
    return () => { markersRef.current.forEach((marker) => marker.remove()); markersRef.current = []; };
  }, [deltas, mapReady, showDomMarkers, highlightedId, isMobile]);

  const fly = useCallback((center: [number, number], zoom: number) => {
    try {
      if (mapRef.current) {
        programmaticRef.current = true;
        mapRef.current.flyTo({ center, zoom, essential: false });
      }
    } catch { window.setTimeout(() => setMapError(true), 0); }
  }, []);
  useEffect(() => { if (mapReady) fly([city.lng, city.lat], city.zoom); }, [city.lat, city.lng, city.zoom, mapReady, fly]);
  useEffect(() => { if (mapReady && permResetKey) fly([PERM_FALLBACK.lng, PERM_FALLBACK.lat], PERM_FALLBACK.zoom); }, [permResetKey, mapReady, fly]);

  const resetToPerm = () => onResetPerm ? onResetPerm() : fly([PERM_FALLBACK.lng, PERM_FALLBACK.lat], PERM_FALLBACK.zoom);
  const retry = () => { setMapError(false); setMapReady(false); setRetryKey((key) => key + 1); };
  return <div className="delta-map-canvas">
    <div ref={containerRef} className="delta-map-surface" role="application" aria-label="Карта дельт Перми" />
    {mapError && <div className="delta-map-local-error" role="alert">
      <h2>Не удалось открыть карту</h2><p>Проверьте соединение или попробуйте ещё раз.</p>
      <button className="delta-map-button" onClick={retry}>Повторить</button>
    </div>}
    <button className="delta-map-reset" onClick={resetToPerm}>К центру Перми</button>
  </div>;
}
