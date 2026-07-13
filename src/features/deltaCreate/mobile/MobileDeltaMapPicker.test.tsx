import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MobileDeltaMapPicker } from './MobileDeltaMapPicker';

const mocks = vi.hoisted(() => {
  const handlers: Record<string, (event: { lngLat: { lat: number; lng: number }; error?: { message?: string } }) => void> = {};
  const removeMap = vi.fn();
  const removeMarker = vi.fn();
  const markerApi = {
    addTo: vi.fn(),
    setLngLat: vi.fn(),
    remove: removeMarker,
  };
  markerApi.addTo.mockReturnValue(markerApi);
  markerApi.setLngLat.mockReturnValue(markerApi);
  const mapApi = {
    addControl: vi.fn(),
    on: vi.fn(),
    flyTo: vi.fn(),
    remove: removeMap,
  };
  mapApi.on.mockImplementation((event: string, callback: (payload: { lngLat: { lat: number; lng: number }; error?: { message?: string } }) => void) => {
    handlers[event] = callback;
  });
  return {
    handlers,
    removeMap,
    removeMarker,
    markerApi,
    mapApi,
    MapMock: vi.fn(() => mapApi),
    MarkerMock: vi.fn(() => markerApi),
    NavigationControlMock: vi.fn(),
  };
});

vi.mock('maplibre-gl', () => ({
  default: { Map: mocks.MapMock, Marker: mocks.MarkerMock, NavigationControl: mocks.NavigationControlMock },
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.keys(mocks.handlers).forEach((key) => delete mocks.handlers[key]);
  vi.unstubAllGlobals();
});

describe('MobileDeltaMapPicker', () => {
  it('creates one map, updates marker for coordinates and cleans up once', () => {
    const onPick = vi.fn();
    const view = render(<MobileDeltaMapPicker lat={58.01} lng={56.25} onPick={onPick} />);

    expect(mocks.MapMock).toHaveBeenCalledTimes(1);
    expect(mocks.MarkerMock).toHaveBeenCalledTimes(1);
    expect(mocks.markerApi.setLngLat).toHaveBeenLastCalledWith([56.25, 58.01]);

    view.rerender(<MobileDeltaMapPicker lat={58.02} lng={56.26} onPick={onPick} />);
    expect(mocks.MapMock).toHaveBeenCalledTimes(1);
    expect(mocks.MarkerMock).toHaveBeenCalledTimes(1);
    expect(mocks.markerApi.setLngLat).toHaveBeenLastCalledWith([56.26, 58.02]);

    view.unmount();
    expect(mocks.removeMap).toHaveBeenCalledTimes(1);
    expect(mocks.removeMarker).toHaveBeenCalledTimes(1);
  });

  it('valid and invalid map clicks are handled without clearing previous point', async () => {
    const onPick = vi.fn();
    render(<MobileDeltaMapPicker lat={58.01} lng={56.25} onPick={onPick} />);

    mocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
    expect(onPick).toHaveBeenCalledWith(58.02, 56.26, 'map');

    mocks.handlers.click({ lngLat: { lat: 55.75, lng: 37.61 } });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('alert')).toHaveTextContent('Сейчас Дельты можно добавлять только в Перми');
  });

  it('retry destroys old map exactly once and creates one replacement', async () => {
    const onPick = vi.fn();
    render(<MobileDeltaMapPicker lat={null} lng={null} onPick={onPick} />);
    mocks.handlers.error({ lngLat: { lat: 0, lng: 0 }, error: { message: 'style failed' } });

    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));

    expect(mocks.removeMap).toHaveBeenCalledTimes(1);
    expect(mocks.MapMock).toHaveBeenCalledTimes(2);
  });
});
