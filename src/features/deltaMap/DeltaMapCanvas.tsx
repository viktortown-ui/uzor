import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DeltaMapItem } from '../deltas/deltaTypes';
import { isFatalMapLibreError } from '../maps/mapLibreErrorPolicy';
import { createDeltaEmojiImage, DELTA_EMOJI_PIXEL_RATIO, type RuntimeMapImage } from './deltaEmojiImage';
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
  showReset?: boolean;
  permResetKey?: number;
  onInteraction?: () => void;
};

export const PRODUCTION_MAP_STYLE_URL = import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
const visualTestStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'visual-attribution': {
      type: 'geojson',
      attribution: 'Visual test map data',
      data: { type: 'FeatureCollection', features: [] },
    },
  },
  layers: [
    { id: 'visual-background', type: 'background', paint: { 'background-color': '#173451' } },
    { id: 'visual-attribution-layer', type: 'circle', source: 'visual-attribution', paint: { 'circle-opacity': 0 } },
  ],
};
const mapStyle = import.meta.env.VITE_VISUAL_TEST_MODE === 'true' ? visualTestStyle : PRODUCTION_MAP_STYLE_URL;
export const DELTA_SOURCE_ID = 'delta-cluster-source';
export const DELTA_CLUSTER_LAYER_ID = 'delta-clusters';
export const DELTA_CLUSTER_COUNT_LAYER_ID = 'delta-cluster-count';
export const DELTA_EMOJI_LAYER_ID = 'delta-emojis';
export const DELTA_EMOJI_HIT_LAYER_ID = 'delta-emoji-hit';
export const DELTA_CLUSTER_MAX_ZOOM = 12;

function deltaVisualKey(delta: DeltaMapItem, selectedId?: string | null, highlightedId?: string | null): string {
  const emphasis = highlightedId === delta.id ? '-highlighted' : selectedId === delta.id ? '-selected' : '';
  return `delta-emoji-${delta.direction}-${delta.status}${emphasis}`;
}

type ImageCapableMap = maplibregl.Map & { hasImage?: (id: string) => boolean; addImage?: (id: string, image: RuntimeMapImage, options?: { pixelRatio: number }) => void };

function visualKeysFromGeoJson(data: DeltaGeoJson): string[] { return [...new Set(data.features.map((feature) => feature.properties.visualKey))]; }
function registerDeltaEmojiImages(map: maplibregl.Map, data: DeltaGeoJson): void {
  const imageMap = map as ImageCapableMap;
  if (typeof imageMap.addImage !== 'function') return;
  for (const key of visualKeysFromGeoJson(data)) {
    if (typeof imageMap.hasImage === 'function' && imageMap.hasImage(key)) continue;
    imageMap.addImage(key, createDeltaEmojiImage(key), { pixelRatio: DELTA_EMOJI_PIXEL_RATIO });
  }
}

function geoJson(deltas: DeltaMapItem[], selectedId?: string | null, highlightedId?: string | null): DeltaGeoJson {
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
        visualKey: deltaVisualKey(delta, selectedId, highlightedId),
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
  selectedId,
  highlightedId,
  onViewport,
  onSelect,
  onResetPerm,
  showReset = true,
  permResetKey = 0,
  onInteraction,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const timerRef = useRef<number | null>(null);
  const resizeFrameRef = useRef<number | null>(null);
  const usableMapRef = useRef(false);
  const programmaticRef = useRef(false);
  const onViewportRef = useRef(onViewport);
  const onSelectRef = useRef(onSelect);
  const onInteractionRef = useRef(onInteraction);
  const deltasRef = useRef(deltas);
  const selectedIdRef = useRef(selectedId);
  const highlightedIdRef = useRef(highlightedId);
  const initialCityRef = useRef(city);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => { onViewportRef.current = onViewport; }, [onViewport]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onInteractionRef.current = onInteraction; }, [onInteraction]);
  useEffect(() => { deltasRef.current = deltas; }, [deltas]);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
  useEffect(() => { highlightedIdRef.current = highlightedId; }, [highlightedId]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    let map: maplibregl.Map | null = null;
    let removed = false;
    const cleanups: Array<() => void> = [];
    const fatal = () => { setMapReady(false); setMapError(true); };

    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle,
        center: [initialCityRef.current.lng, initialCityRef.current.lat],
        zoom: initialCityRef.current.zoom,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'bottom-right');
      if ('geolocation' in navigator) {
        map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false }, trackUserLocation: false }), 'bottom-right');
      }

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
      const initialize = () => {
        try {
          if (!map) return;
          if (!map.getSource(DELTA_SOURCE_ID)) {
            map.addSource(DELTA_SOURCE_ID, {
              type: 'geojson',
              data: geoJson(deltasRef.current, selectedIdRef.current, highlightedIdRef.current),
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
              maxzoom: DELTA_CLUSTER_MAX_ZOOM + 1,
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
              maxzoom: DELTA_CLUSTER_MAX_ZOOM + 1,
              layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
              paint: { 'text-color': '#07101f' },
            });
          }
          const imageData = geoJson(deltasRef.current, selectedIdRef.current, highlightedIdRef.current);
          registerDeltaEmojiImages(map, imageData);
          if (!map.getLayer(DELTA_EMOJI_LAYER_ID)) {
            map.addLayer({
              id: DELTA_EMOJI_LAYER_ID,
              type: 'symbol',
              source: DELTA_SOURCE_ID,
              filter: ['!', ['has', 'point_count']],
              layout: {
                'icon-image': ['get', 'visualKey'],
                'icon-anchor': 'bottom',
                'icon-size': 1,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true,
                'icon-pitch-alignment': 'viewport',
                'icon-rotation-alignment': 'viewport',
              },
            });
          }
          if (!map.getLayer(DELTA_EMOJI_HIT_LAYER_ID)) {
            map.addLayer({
              id: DELTA_EMOJI_HIT_LAYER_ID,
              type: 'circle',
              source: DELTA_SOURCE_ID,
              filter: ['!', ['has', 'point_count']],
              paint: {
                'circle-radius': 22,
                'circle-translate': [0, -21],
                'circle-translate-anchor': 'viewport',
                'circle-color': 'rgba(0,0,0,0)',
              },
            });
          }
          usableMapRef.current = true;
          const readyAfterIdle = () => {
            if (!map || removed) return;
            setMapReady(true);
            setMapError(false);
            onViewportRef.current(boundsFromMap(map));
          };
          map.once('idle', readyAfterIdle);
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
        ['dragstart', interaction], ['zoomstart', interaction],
        ['click', DELTA_CLUSTER_LAYER_ID, clusterClick], ['click', DELTA_EMOJI_HIT_LAYER_ID, pointClick],
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
      try { map?.remove(); } catch { /* noop */ }
      mapRef.current = null;
      usableMapRef.current = false;
    };
  }, [retryKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try { const nextData = geoJson(deltas, selectedId, highlightedId); registerDeltaEmojiImages(mapRef.current, nextData); (mapRef.current.getSource(DELTA_SOURCE_ID) as maplibregl.GeoJSONSource | undefined)?.setData(nextData); }
    catch { window.setTimeout(() => setMapError(true), 0); }
  }, [deltas, highlightedId, mapReady, selectedId]);

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
  return <div className="delta-map-canvas" data-map-render-state={mapError ? 'error' : mapReady ? 'ready' : 'loading'}>
    <div ref={containerRef} className="delta-map-surface" role="application" aria-label="Карта дельт Перми" />
    {mapError && <div className="delta-map-local-error" role="alert">
      <h2>Не удалось открыть карту</h2><p>Проверьте соединение или попробуйте ещё раз.</p>
      <button className="delta-map-button" onClick={retry}>Повторить</button>
    </div>}
    {showReset && <button className="delta-map-reset secondary-action" onClick={resetToPerm}>К центру Перми</button>}
  </div>;
}
