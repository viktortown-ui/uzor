import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeltaMapItem } from '../deltas/deltaTypes';

const maps: MockMap[] = [];
const markerRemove = vi.fn();
const source = { setData: vi.fn(), getClusterExpansionZoom: vi.fn().mockResolvedValue(14) };
class MockMap {
  handlers = new Map<string, Array<(payload?: unknown) => void>>();
  sources = new Map<string, unknown>();
  layers = new Map<string, unknown>();
  zoom = 12;
  remove = vi.fn(); flyTo = vi.fn(); easeTo = vi.fn(); addControl = vi.fn();
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
afterEach(() => { cleanup(); maps.length = 0; MapCtor.mockClear(); MarkerCtor.mockClear(); markerRemove.mockClear(); source.setData.mockClear(); source.getClusterExpansionZoom.mockClear().mockResolvedValue(14); vi.resetModules(); });

async function renderLoaded(zoom = 12, deltas = [delta('1')]) {
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
    expect(map.addLayer).toHaveBeenCalledTimes(3);
    expect([...map.layers.values()]).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'delta-clusters', maxzoom: 13 }), expect.objectContaining({ id: 'delta-cluster-count', maxzoom: 13 }), expect.objectContaining({ id: 'delta-unclustered-points', maxzoom: 13 })]));
  });
  it('recovers missing layers independently when the source already exists', async () => {
    const { map } = await renderLoaded();
    map.layers.delete('delta-cluster-count');
    act(() => map.emit('style.load'));
    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.addLayer).toHaveBeenCalledTimes(4);
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
  it('removes both event overloads during cleanup', async () => {
    const { map, view } = await renderLoaded();
    view.unmount();
    expect(map.off).toHaveBeenCalledTimes(9);
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
