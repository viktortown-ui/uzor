import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('maplibre-gl', () => {
  class MapMock {
    handlers: Record<string, Array<(event?: unknown) => void>> = {};
    constructor() { setTimeout(() => this.emit('load'), 0); }
    on(event: string, cb: (event?: unknown) => void) { (this.handlers[event] ||= []).push(cb); return this; }
    emit(event: string, payload?: unknown) { (this.handlers[event] || []).forEach((cb) => cb(payload)); }
    remove() { return undefined; }
    flyTo() { return this; }
    addControl() { return this; }
    getBounds() { return { getSouth: () => 57, getWest: () => 55, getNorth: () => 59, getEast: () => 57 }; }
  }
  class MarkerMock { setLngLat() { return this; } addTo() { return this; } remove() { return undefined; } }
  class NavigationControlMock {}
  class GeolocateControlMock {}
  return { default: { Map: MapMock, Marker: MarkerMock, NavigationControl: NavigationControlMock, GeolocateControl: GeolocateControlMock }, Map: MapMock, Marker: MarkerMock, NavigationControl: NavigationControlMock, GeolocateControl: GeolocateControlMock };
});
