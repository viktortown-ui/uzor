import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeltaMapItem } from '../deltas/deltaTypes';

const maps: MockMap[] = [];
const originalMatchMedia = window.matchMedia;
const originalResizeObserver = window.ResizeObserver;
const originalVisualViewport = window.visualViewport;
const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
type MockMql = { matches: boolean; addEventListener: ReturnType<typeof vi.fn>; removeEventListener: ReturnType<typeof vi.fn>; emit: () => void };
let currentMql: MockMql | null = null;
function mockBreakpoint(matches: boolean) { const listeners: Array<() => void> = []; currentMql = { matches, addEventListener: vi.fn((_event: string, cb: () => void) => listeners.push(cb)), removeEventListener: vi.fn(), emit: () => listeners.forEach((cb) => cb()) }; Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => currentMql) }); return currentMql; }
const markerRemove = vi.fn();
const source = { setData: vi.fn(), getClusterExpansionZoom: vi.fn().mockResolvedValue(14) };
class MockMap {
  handlers = new Map<string, Array<(payload?: unknown) => void>>();
  sources = new Map<string, unknown>();
  layers = new Map<string, unknown>();
  zoom = 12;
  images = new Set<string>();
  remove = vi.fn(); flyTo = vi.fn(); easeTo = vi.fn(); addControl = vi.fn(); resize = vi.fn(); setLayoutProperty = vi.fn();
  addImage = vi.fn((id: string) => { this.images.add(id); }); hasImage = vi.fn((id: string) => this.images.has(id));
  getBounds = vi.fn(() => ({ getSouth: () => 57, getWest: () => 55, getNorth: () => 59, getEast: () => 57 }));
  getZoom = vi.fn(() => this.zoom);
  getSource = vi.fn((id: string) => this.sources.get(id));
  addSource = vi.fn((id: string, value: unknown) => { this.sources.set(id, id === 'delta-cluster-source' ? source : value); });
  getLayer = vi.fn((id: string) => this.layers.get(id));
  addLayer = vi.fn((layer: { id: string }) => { this.layers.set(layer.id, layer); });
  on = vi.fn((event: string, layerOrHandler: string | ((payload?: unknown) => void), handler?: (payload?: unknown) => void) => {
    const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
    const callback = typeof layerOrHandler === 'function' ? layerOrHandler : handler!;
    this.handlers.set(key, [...(this.handlers.get(key) ?? []), callback]); return this;
  });
  off = vi.fn((event: string, layerOrHandler: string | ((payload?: unknown) => void), handler?: (payload?: unknown) => void) => {
    const key = typeof layerOrHandler === 'string' ? `${event}:${layerOrHandler}` : event;
    const callback = typeof layerOrHandler === 'function' ? layerOrHandler : handler!;
    this.handlers.set(key, (this.handlers.get(key) ?? []).filter((item) => item !== callback)); return this;
  });
  constructor() { maps.push(this); }
  emit(event: string, payload?: unknown, layer?: string) { for (const callback of this.handlers.get(layer ? `${event}:${layer}` : event) ?? []) callback(payload); }
}
const MapCtor = vi.fn(() => new MockMap());
const MarkerCtor = vi.fn(() => ({ setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis(), remove: markerRemove }));
vi.mock('maplibre-gl', () => ({ default: { Map: MapCtor, Marker: MarkerCtor, NavigationControl: vi.fn(), GeolocateControl: vi.fn() } }));

const delta = (id: string): DeltaMapItem => ({ id, category: { slug: 'transport', title: 'Транспорт', iconKey: 'transport' }, direction: 'positive', statement: `Дельта ${id}`, status: 'new', confirmCount: 1, disconfirmCount: 0, confirmationTarget: 3, priorityScore: .1, location: { lat: 58, lng: 56, label: 'Пермь' }, lastActivityAt: '2026-07-10T00:00:00.000Z' });
async function loadCanvas() { return (await import('./DeltaMapCanvas')).DeltaMapCanvas; }
afterEach(() => { cleanup(); maps.length = 0; currentMql = null; Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia }); if (originalResizeObserver === undefined) delete (window as unknown as { ResizeObserver?: unknown }).ResizeObserver; else Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: originalResizeObserver }); if (originalVisualViewport === undefined) delete (window as unknown as { visualViewport?: unknown }).visualViewport; else Object.defineProperty(window, 'visualViewport', { configurable: true, value: originalVisualViewport }); if (originalRequestAnimationFrame === undefined) delete (window as unknown as { requestAnimationFrame?: unknown }).requestAnimationFrame; else Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: originalRequestAnimationFrame }); if (originalCancelAnimationFrame === undefined) delete (window as unknown as { cancelAnimationFrame?: unknown }).cancelAnimationFrame; else Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, value: originalCancelAnimationFrame }); MapCtor.mockClear(); MarkerCtor.mockClear(); markerRemove.mockClear(); source.setData.mockClear(); source.getClusterExpansionZoom.mockClear().mockResolvedValue(14); vi.resetModules(); });

async function renderLoaded(zoom = 12, deltas = [delta('1')]) {
  if (typeof window.requestAnimationFrame !== 'function') Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0) });
  if (typeof window.cancelAnimationFrame !== 'function') Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, value: (id: number) => window.clearTimeout(id) });
  const Canvas = await loadCanvas();
  const onSelect = vi.fn();
  const view = render(<Canvas deltas={deltas} onViewport={vi.fn()} onSelect={onSelect} />);
  maps[0].zoom = zoom;
  act(() => maps[0].emit('load'));
  return { Canvas, onSelect, view, map: maps[0] };
}

describe('DeltaMapCanvas cluster lifecycle', () => {
  it('adds the clustered source and all layers exactly once', async () => {
    const { map } = await renderLoaded();
    act(() => map.emit('style.load'));
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addSource).toHaveBeenCalledWith('delta-cluster-source', expect.objectContaining({ cluster: true, clusterRadius: 52, clusterMaxZoom: 12 }));
    expect(map.addLayer).toHaveBeenCalledTimes(5);
    expect([...map.layers.values()]).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'delta-clusters', maxzoom: 13 }), expect.objectContaining({ id: 'delta-cluster-count', maxzoom: 13 }), expect.objectContaining({ id: 'delta-unclustered-points', maxzoom: 13 })]));
  });
  it('recovers missing layers independently when the source already exists', async () => {
    const { map } = await renderLoaded();
    map.layers.delete('delta-cluster-count');
    act(() => map.emit('style.load'));
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(6);
    expect(map.layers.has('delta-cluster-count')).toBe(true);
  });
  it('updates source data without reconstructing the map', async () => {
    const { Canvas, view } = await renderLoaded();
    source.setData.mockClear();
    view.rerender(<Canvas deltas={[delta('1'), delta('2')]} onViewport={vi.fn()} onSelect={vi.fn()} />);
    expect(source.setData).toHaveBeenCalledTimes(1);
    expect(MapCtor).toHaveBeenCalledTimes(1);
  });
  it('expands a cluster and does not select a Delta', async () => {
    const { map, onSelect } = await renderLoaded();
    act(() => map.emit('click', { features: [{ properties: { cluster_id: 7 }, geometry: { type: 'Point', coordinates: [56, 58] } }] }, 'delta-clusters'));
    await waitFor(() => expect(source.getClusterExpansionZoom).toHaveBeenCalledWith(7));
    expect(map.easeTo).toHaveBeenCalledWith({ center: [56, 58], zoom: 14 });
    expect(onSelect).not.toHaveBeenCalled();
  });
  it('opens the matching unclustered Delta', async () => {
    const items = [delta('1'), delta('2')];
    const { map, onSelect } = await renderLoaded(12, items);
    act(() => map.emit('click', { features: [{ properties: { id: '2' } }] }, 'delta-unclustered-points'));
    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });
  it.each([12, 12.5, 12.99])('at zoom %s uses only GeoJSON representation', async (zoom) => {
    await renderLoaded(zoom);
    expect(MarkerCtor).not.toHaveBeenCalled();
  });
  it('at zoom 13 creates only bottom-anchored DOM markers', async () => {
    await renderLoaded(13);
    expect(MarkerCtor).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'bottom' }));
  });
  it('crossing the boundary removes DOM markers when returning below 13', async () => {
    const { map } = await renderLoaded(13);
    expect(MarkerCtor).toHaveBeenCalledTimes(1);
    map.zoom = 12.99;
    act(() => map.emit('zoom'));
    expect(markerRemove).toHaveBeenCalled();
  });

  it('mobile zoom 13 uses GL flag and hit layers instead of DOM markers', async () => {
    mockBreakpoint(true);
    const { map, onSelect } = await renderLoaded(13, [delta('1'), delta('2')]);
    expect(MarkerCtor).not.toHaveBeenCalled();
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'delta-mobile-flags', type: 'symbol', minzoom: 13, layout: expect.objectContaining({ 'icon-anchor': 'bottom' }) }));
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'delta-mobile-flag-hit', type: 'circle', minzoom: 13, paint: expect.objectContaining({ 'circle-radius': 22 }) }));
    act(() => map.emit('click', { features: [{ properties: { id: '2' } }] }, 'delta-mobile-flag-hit'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
  });
  it('repeated style.load does not duplicate mobile flag layers', async () => {
    mockBreakpoint(true);
    const { map } = await renderLoaded(13);
    act(() => map.emit('style.load'));
    expect([...map.layers.keys()].filter((id) => id === 'delta-mobile-flags')).toHaveLength(1);
    expect([...map.layers.keys()].filter((id) => id === 'delta-mobile-flag-hit')).toHaveLength(1);
  });

  it('registers images before setData when deltas arrive after map initialization', async () => {
    mockBreakpoint(true);
    const { Canvas, view, map } = await renderLoaded(13, []);
    map.addImage.mockClear(); source.setData.mockClear();
    const late = { ...delta('late'), status: 'confirmed' as const };
    view.rerender(<Canvas deltas={[late]} onViewport={vi.fn()} onSelect={vi.fn()} />);
    expect(map.addImage).toHaveBeenCalledWith('delta-flag-positive-confirmed', expect.objectContaining({ width: 44, height: 52 }), { pixelRatio: 1 });
    expect(source.setData).toHaveBeenCalledWith(expect.objectContaining({ features: [expect.objectContaining({ properties: expect.objectContaining({ visualKey: 'delta-flag-positive-confirmed' }) })] }));
    expect(map.layers.has('delta-mobile-flags')).toBe(true);
    expect(MapCtor).toHaveBeenCalledTimes(1);
  });
  it('mobile hit layer is translated upward to cover the bottom-anchored flag cloth and visible layer also selects', async () => {
    mockBreakpoint(true);
    const { map, onSelect } = await renderLoaded(13, [delta('hit')]);
    expect(map.layers.get('delta-mobile-flag-hit')).toEqual(expect.objectContaining({ paint: expect.objectContaining({ 'circle-radius': 22, 'circle-translate': [10, -22] }) }));
    act(() => map.emit('click', { features: [{ properties: { id: 'hit' } }] }, 'delta-mobile-flags'));
    act(() => map.emit('click', { features: [{ properties: { id: 'hit' } }] }, 'delta-mobile-flag-hit'));
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('removes both event overloads during cleanup', async () => {
    const { map, view } = await renderLoaded();
    view.unmount();
    expect(map.off).toHaveBeenCalledTimes(11);
    expect(map.off).toHaveBeenCalledWith('click', 'delta-clusters', expect.any(Function));
    expect(map.off).toHaveBeenCalledWith('load', expect.any(Function));
  });
});

describe('DeltaMapCanvas map and marker behavior', () => {
  it('does not reconstruct MapLibre when callbacks or city change', async () => {
    const { Canvas, view, map } = await renderLoaded(13, []);
    view.rerender(<Canvas city={{ lat: 58.2, lng: 56.2, zoom: 12 }} deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />);
    expect(MapCtor).toHaveBeenCalledTimes(1);
    expect(map.flyTo).toHaveBeenCalledWith({ center: [56.2, 58.2], zoom: 12, essential: false });
  });
  it('marker status and keyboard interactions remain accessible', async () => {
    const { createDeltaMarkerElement } = await import('./DeltaMarker');
    const item = { ...delta('flag'), status: 'checking' as const, direction: 'negative' as const };
    const onSelect = vi.fn(); const marker = createDeltaMarkerElement(item, onSelect, true);
    expect(marker).toHaveClass('delta-marker', 'core-negative', 'ring-checking', 'is-highlighted');
    marker.click(); fireEvent.keyDown(marker, { key: 'Enter' }); fireEvent.keyDown(marker, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(3);
  });
  it('retries after constructor and fatal initial style errors', async () => {
    MapCtor.mockImplementationOnce(() => { throw new Error('boom'); }).mockImplementation(() => new MockMap());
    const Canvas = await loadCanvas(); render(<Canvas deltas={[]} onViewport={vi.fn()} onSelect={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(MapCtor).toHaveBeenCalledTimes(2);
    const map = maps[0]; act(() => map.emit('error', { error: { message: 'style parse failure' } }));
    await userEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(map.remove).toHaveBeenCalledTimes(1);
  });
});

describe('DeltaMapCanvas resize and breakpoint synchronization', () => {
  function installResizeHarness() {
    let nextFrame = 1; const frames = new Map<number, FrameRequestCallback>();
    const request = vi.fn((cb: FrameRequestCallback) => { const id = nextFrame++; frames.set(id, cb); return id; });
    const cancel = vi.fn((id: number) => { frames.delete(id); });
    Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: request });
    Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, value: cancel });
    const roInstances: Array<{ cb: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn>; observe: ReturnType<typeof vi.fn> }> = [];
    class MockResizeObserver { cb: ResizeObserverCallback; disconnect = vi.fn(); observe = vi.fn(); constructor(cb: ResizeObserverCallback) { this.cb = cb; roInstances.push(this); } }
    Object.defineProperty(window, 'ResizeObserver', { configurable: true, value: MockResizeObserver });
    const vvListeners = new Map<string, Array<() => void>>();
    const visualViewport = { addEventListener: vi.fn((event: string, cb: () => void) => vvListeners.set(event, [...(vvListeners.get(event) ?? []), cb])), removeEventListener: vi.fn((event: string, cb: () => void) => vvListeners.set(event, (vvListeners.get(event) ?? []).filter((item) => item !== cb))) };
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: visualViewport });
    return { request, cancel, frames, flush: () => { const pending = [...frames.entries()]; frames.clear(); pending.forEach(([id, cb]) => cb(id)); }, roInstances, visualViewport, emitVv: (event: string) => (vvListeners.get(event) ?? []).forEach((cb) => cb()) };
  }
  it('schedules initial RAF resize, coalesces observer and visualViewport events, and cleans up', async () => {
    const harness = installResizeHarness(); mockBreakpoint(true);
    const { map, view } = await renderLoaded(13);
    expect(harness.request).toHaveBeenCalledTimes(1);
    harness.flush(); expect(map.resize).toHaveBeenCalledTimes(1);
    act(() => { harness.roInstances[0].cb([], harness.roInstances[0] as unknown as ResizeObserver); harness.roInstances[0].cb([], harness.roInstances[0] as unknown as ResizeObserver); harness.emitVv('resize'); harness.emitVv('scroll'); });
    expect(harness.request).toHaveBeenCalledTimes(2);
    harness.flush(); expect(map.resize).toHaveBeenCalledTimes(2);
    act(() => { harness.emitVv('resize'); });
    view.unmount();
    expect(harness.cancel).toHaveBeenCalled();
    expect(harness.roInstances[0].disconnect).toHaveBeenCalled();
    expect(harness.visualViewport.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(harness.visualViewport.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(currentMql?.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
  it('breakpoint changes toggle layers and DOM markers without reconstructing the map', async () => {
    const breakpoint = mockBreakpoint(false);
    const { map } = await renderLoaded(13);
    expect(MarkerCtor).toHaveBeenCalledTimes(1);
    act(() => { breakpoint.matches = true; breakpoint.emit(); map.emit('zoom'); });
    expect(MapCtor).toHaveBeenCalledTimes(1);
    expect(markerRemove).toHaveBeenCalled();
    expect(map.setLayoutProperty).toHaveBeenCalledWith('delta-mobile-flags', 'visibility', 'visible');
    act(() => { breakpoint.matches = false; breakpoint.emit(); map.emit('zoom'); });
    expect(MapCtor).toHaveBeenCalledTimes(1);
    expect(map.setLayoutProperty).toHaveBeenCalledWith('delta-mobile-flags', 'visibility', 'none');
    expect(MarkerCtor).toHaveBeenCalledWith(expect.objectContaining({ anchor: 'bottom' }));
  });
});
