import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileDeltaCreateFlow } from './MobileDeltaCreateFlow';
import { DELTA_CREATE_PRODUCTION_STORAGE_KEY } from '../deltaCreateProductionLogic';
import { findSimilarDeltas, loadDeltaCategories } from '../../deltas/deltaApi';
import { loadDeltaMapContext } from '../../deltaMap/deltaMapLogic';
import { createEmptyDeltaDraft, serializeDeltaDraft } from '../deltaCreateLogic';

const mapMocks = vi.hoisted(() => {
  const handlers: Record<string, (event: { lngLat: { lat: number; lng: number }; error?: { message?: string } }) => void> = {};
  const markerApi = { addTo: vi.fn(), setLngLat: vi.fn(), remove: vi.fn() };
  markerApi.addTo.mockReturnValue(markerApi);
  markerApi.setLngLat.mockReturnValue(markerApi);
  const mapApi = { addControl: vi.fn(), on: vi.fn(), flyTo: vi.fn(), remove: vi.fn() };
  mapApi.on.mockImplementation((event: string, callback: (payload: { lngLat: { lat: number; lng: number }; error?: { message?: string } }) => void) => {
    handlers[event] = callback;
  });
  return { handlers, mapApi, markerApi, MapMock: vi.fn(() => mapApi), MarkerMock: vi.fn(() => markerApi), NavigationControlMock: vi.fn() };
});

vi.mock('maplibre-gl', () => ({
  default: { Map: mapMocks.MapMock, Marker: mapMocks.MarkerMock, NavigationControl: mapMocks.NavigationControlMock },
}));
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
vi.mock('../../../app/appMode', () => ({ isDemoMode: false, appMode: 'production' }));
vi.mock('../../deltaMap/deltaMapLogic', async () => {
  const actual = await vi.importActual<typeof import('../../deltaMap/deltaMapLogic')>('../../deltaMap/deltaMapLogic');
  return { ...actual, loadDeltaMapContext: vi.fn() };
});
vi.mock('../../deltas/deltaApi', async () => {
  const actual = await vi.importActual<typeof import('../../deltas/deltaApi')>('../../deltas/deltaApi');
  return {
    ...actual,
    loadDeltaCategories: vi.fn(),
    findSimilarDeltas: vi.fn(),
    createDelta: vi.fn(),
    reactToDelta: vi.fn(),
    getDeltaCard: vi.fn(),
  };
});

const categories = [{ slug: 'transport', title: 'Транспорт', iconKey: 'transport' }];
const circle = { circleId: 'circle-1', citySlug: 'perm' as const };
function LocationProbe() {
  const location = useLocation();
  return <output aria-label="route">{`${location.pathname}${location.search}`}</output>;
}

function renderFlow(initial = '/contribute') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/contribute" element={<><MobileDeltaCreateFlow mode="production" /><LocationProbe /></>} />
        <Route path="/pulse" element={<h1>Пульс</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(loadDeltaCategories).mockResolvedValue(categories);
  vi.mocked(loadDeltaMapContext).mockResolvedValue(circle);
  vi.mocked(findSimilarDeltas).mockResolvedValue([]);
});

afterEach(() => {
  cleanup(); localStorage.clear(); vi.clearAllMocks();
  Object.keys(mapMocks.handlers).forEach((key) => delete mapMocks.handlers[key]);
});

describe('MobileDeltaCreateFlow observation controller', () => {
  it('shows featured observations without the old questionnaire and opens location in one tap', async () => {
    renderFlow();
    expect(await screen.findByRole('heading', { name: 'Что заметили?' })).toBeInTheDocument();
    expect(screen.getByText('Часто отмечают')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Очередь стала длиннее' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Освещение пропало' })).not.toBeInTheDocument();
    expect(screen.queryByText('Когда заметили?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Продолжить' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Автобус приходится ждать дольше' }));
    expect(await screen.findByRole('heading', { name: 'Где это?' })).toBeInTheDocument();
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute?stage=location');
  });

  it('global custom requires an active category and submits on the first valid click', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Другое' }));
    const submit = screen.getByRole('button', { name: 'Указать место' });
    expect(submit).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Услуги' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Транспорт' }));
    fireEvent.click(screen.getByRole('button', { name: 'Стало хуже' }));
    fireEvent.change(screen.getByLabelText('Короткий заголовок'), { target: { value: 'Очередь стала длиннее' } });
    fireEvent.click(submit);
    expect(await screen.findByRole('heading', { name: 'Где это?' })).toBeInTheDocument();
  });

  it('filters presets and custom mode keeps title canonical', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Транспорт' }));
    expect(screen.getByRole('button', { name: 'Транспорт ходит реже' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Другое изменение' }));
    fireEvent.click(screen.getByRole('button', { name: 'Стало хуже' }));
    fireEvent.change(screen.getByLabelText('Короткий заголовок'), { target: { value: 'Очередь у врача стала длиннее' } });
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    expect(await screen.findByText('Очередь у врача стала длиннее')).toBeInTheDocument();
    const saved = localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY) || '';
    expect(saved).not.toContain('стала длиннее стало хуже');
  });

  it('manual map selection requires explicit point confirmation', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
    expect(await screen.findByRole('button', { name: 'Использовать эту точку' })).toBeInTheDocument();
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute?stage=location');
    fireEvent.click(screen.getByRole('button', { name: 'Использовать эту точку' }));
    expect(await screen.findByRole('heading', { name: 'Проверить' })).toBeInTheDocument();
  });

  it('restores an unmatched older draft as custom without discarding its text or details', async () => {
    const oldDraft = {
      ...createEmptyDeltaDraft(),
      categorySlug: 'transport' as const,
      direction: 'negative' as const,
      changeType: 'slower' as const,
      subject: 'Старое наблюдение автобуса',
      statement: 'Старая ручная формулировка',
      statementMode: 'manual' as const,
      details: 'Важная сохранённая подробность',
    };
    localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(oldDraft));
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Продолжить' }));
    expect(await screen.findByRole('heading', { name: 'Другое изменение' })).toBeInTheDocument();
    expect(screen.getByLabelText('Короткий заголовок')).toHaveValue('Старое наблюдение автобуса');
    expect(localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY)).toContain('Важная сохранённая подробность');
  });
});
