import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileDeltaCreateFlow } from './MobileDeltaCreateFlow';
import { DELTA_CREATE_PRODUCTION_STORAGE_KEY } from '../deltaCreateProductionLogic';
import { createDelta, findSimilarDeltas, getDeltaCard, loadDeltaCategories, reactToDelta } from '../../deltas/deltaApi';
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
const delta = {
  id: 'delta-1', statement: 'Автобус приходится ждать дольше', category: categories[0], direction: 'negative',
  subject: 'Автобус приходится ждать дольше', changeType: 'slower', details: null, observedWindow: 'today',
  impactLevel: 'noticeable', status: 'checking', moderationState: 'visible', confirmCount: 1, disconfirmCount: 0,
  confirmationTarget: 3, location: { lat: 58.02, lng: 56.26, label: 'Выбранная точка в Перми' }, priorityScore: 0,
  createdAt: '2026-01-01T00:00:00.000Z', lastActivityAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-02T00:00:00.000Z',
} as const;
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

async function reachPresetReview() {
  fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
  mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
  fireEvent.click(await screen.findByRole('button', { name: 'Использовать эту точку' }));
  await screen.findByRole('heading', { name: 'Проверить' });
}

beforeEach(() => {
  vi.mocked(loadDeltaCategories).mockResolvedValue(categories);
  vi.mocked(loadDeltaMapContext).mockResolvedValue(circle);
  vi.mocked(findSimilarDeltas).mockResolvedValue([]);
  vi.mocked(createDelta).mockResolvedValue({ delta, effect: { type: 'created', previousStatus: null, newStatus: 'checking', message: 'ok', detail: 'Первая отметка закреплена.' } });
  vi.mocked(reactToDelta).mockResolvedValue({ delta: { id: 'delta-existing', status: 'checking', confirmationTarget: 3, confirmCount: 2, disconfirmCount: 0, progress: { current: 2, target: 3 } }, effect: { type: 'reaction', previousStatus: 'new', newStatus: 'checking', message: 'ok', detail: 'Ваш отклик усилил изменение.' } });
  vi.mocked(getDeltaCard).mockResolvedValue({ ...delta, id: 'delta-existing' });
});

afterEach(() => {
  cleanup(); localStorage.clear(); vi.clearAllMocks();
  vi.unstubAllGlobals();
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

  it('valid geolocation opens review automatically', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 58.02, longitude: 56.26 } } as GeolocationPosition) } });
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отметить рядом со мной' }));
    expect(await screen.findByRole('heading', { name: 'Проверить' })).toBeInTheDocument();
  });

  it('geolocation denial remains on location with a visible message', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (_success: PositionCallback, failure: PositionErrorCallback) => failure({ code: 1 } as GeolocationPositionError) } });
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отметить рядом со мной' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Доступ к местоположению не предоставлен');
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute?stage=location');
  });

  it('outside-Perm geolocation remains on location', async () => {
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: 55.75, longitude: 37.61 } } as GeolocationPosition) } });
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отметить рядом со мной' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Сейчас Дельты можно добавлять только в Перми');
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute?stage=location');
  });

  it('commits a manually entered landmark atomically into review and persistence', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
    fireEvent.click(await screen.findByText('Добавить ориентир'));
    fireEvent.change(screen.getByPlaceholderText('Остановка Попова или участок улицы Ленина'), { target: { value: 'Остановка Попова' } });
    fireEvent.click(screen.getByRole('button', { name: 'Использовать эту точку' }));
    expect(await screen.findByText('Остановка Попова')).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY)).toContain('"locationLabel":"Остановка Попова"'));
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
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    expect(await screen.findByRole('heading', { name: 'Где это?' })).toBeInTheDocument();
    const saved = localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY) || '';
    expect(saved).toContain('Важная сохранённая подробность');
    expect(saved).toContain('Старая ручная формулировка');
    expect(saved).toContain('"statementMode":"manual"');
  });

  it('preserves an untouched legacy automatic statement', async () => {
    const oldDraft = {
      ...createEmptyDeltaDraft(),
      categorySlug: 'transport' as const,
      direction: 'negative' as const,
      changeType: 'slower' as const,
      subject: 'Старый заголовок автобуса',
      statement: 'Старый заголовок автобуса стал медленнее',
      statementMode: 'auto' as const,
    };
    localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(oldDraft));
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Продолжить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    const saved = localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY) || '';
    expect(saved).toContain('Старый заголовок автобуса стал медленнее');
    expect(saved).toContain('"statementMode":"auto"');
  });

  it('synchronizes a legacy statement after title editing', async () => {
    const oldDraft = {
      ...createEmptyDeltaDraft(),
      categorySlug: 'transport' as const,
      direction: 'negative' as const,
      changeType: 'slower' as const,
      subject: 'Старый заголовок автобуса',
      statement: 'Старый заголовок автобуса стал медленнее',
      statementMode: 'auto' as const,
    };
    localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(oldDraft));
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Продолжить' }));
    fireEvent.change(screen.getByLabelText('Короткий заголовок'), { target: { value: 'Новый заголовок автобуса' } });
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    const saved = localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY) || '';
    expect(saved).toContain('"statement":"Новый заголовок автобуса"');
    expect(saved).toContain('"statementMode":"manual"');
    expect(saved).not.toContain('стал медленнее');
  });

  it('clears a stale similarity decision before reviewing a different custom observation', async () => {
    const staleDraft = {
      ...createEmptyDeltaDraft(),
      categorySlug: 'transport' as const,
      direction: 'negative' as const,
      changeType: 'other' as const,
      subject: 'Старое наблюдение',
      statement: 'Старое наблюдение',
      statementMode: 'manual' as const,
      observedWindow: 'today' as const,
      impactLevel: 'noticeable' as const,
      selectedSimilarDeltaId: 'old-delta-id',
      similarDecision: 'separate' as const,
    };
    localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(staleDraft));
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Продолжить' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Назад' }));
    fireEvent.change(screen.getByLabelText('Короткий заголовок'), { target: { value: 'Совсем другое наблюдение' } });
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
    fireEvent.click(await screen.findByRole('button', { name: 'Использовать эту точку' }));
    expect(await screen.findByText('Похожих изменений рядом не найдено')).toBeInTheDocument();
    expect(findSimilarDeltas).toHaveBeenCalledTimes(1);
    const saved = localStorage.getItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY) || '';
    expect(saved).toContain('"selectedSimilarDeltaId":null');
    expect(saved).toContain('"similarDecision":null');
  });

  it('redirects an incomplete direct review and supports header Back across stages', async () => {
    renderFlow('/contribute?stage=review');
    expect(await screen.findByRole('heading', { name: 'Что заметили?' })).toBeInTheDocument();
    cleanup();
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Автобус приходится ждать дольше' }));
    fireEvent.click(screen.getByLabelText('Назад'));
    expect(await screen.findByRole('heading', { name: 'Что заметили?' })).toBeInTheDocument();
  });

  it('publishes a preset once on double click with canonical subject and statement', async () => {
    renderFlow();
    await reachPresetReview();
    const publish = await screen.findByRole('button', { name: 'Опубликовать' });
    fireEvent.click(publish);
    fireEvent.click(publish);
    expect(await screen.findByRole('heading', { name: 'Дельта опубликована' })).toBeInTheDocument();
    expect(createDelta).toHaveBeenCalledTimes(1);
    expect(createDelta).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Автобус приходится ждать дольше', statement: 'Автобус приходится ждать дольше' }));
  });

  it('publishes a custom observation through createDelta', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Другое' }));
    fireEvent.click(screen.getByRole('button', { name: 'Транспорт' }));
    fireEvent.click(screen.getByRole('button', { name: 'Стало хуже' }));
    fireEvent.change(screen.getByLabelText('Короткий заголовок'), { target: { value: 'Переход стало трудно пройти' } });
    fireEvent.click(screen.getByRole('button', { name: 'Указать место' }));
    mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
    fireEvent.click(await screen.findByRole('button', { name: 'Использовать эту точку' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Опубликовать' }));
    expect(await screen.findByRole('heading', { name: 'Дельта опубликована' })).toBeInTheDocument();
    expect(createDelta).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Переход стало трудно пройти', statement: 'Переход стало трудно пройти', changeType: 'other' }));
  });

  it('retries a failed publication and succeeds', async () => {
    vi.mocked(createDelta).mockRejectedValueOnce(new Error('api down')).mockResolvedValueOnce({ delta, effect: { type: 'created', previousStatus: null, newStatus: 'checking', message: 'ok', detail: 'Первая отметка закреплена.' } });
    renderFlow();
    await reachPresetReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Опубликовать' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { name: 'Дельта опубликована' })).toBeInTheDocument();
    expect(createDelta).toHaveBeenCalledTimes(2);
  });

  it('confirms an existing Delta and uses fallback when card reload fails', async () => {
    vi.mocked(findSimilarDeltas).mockResolvedValueOnce([{ id: 'delta-existing', statement: 'Автобус ходит реже', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 100, locationLabel: 'Остановка', createdAt: '2026-01-01T00:00:00.000Z' }]);
    vi.mocked(getDeltaCard).mockRejectedValueOnce(new Error('reload failed'));
    renderFlow();
    await reachPresetReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Это то же изменение' }));
    expect(await screen.findByRole('heading', { name: 'Вы подтвердили Дельту' })).toBeInTheDocument();
    expect(reactToDelta).toHaveBeenCalledWith('delta-existing', 'confirm');
  });

  it('shows the author reaction lock without losing the review', async () => {
    vi.mocked(findSimilarDeltas).mockResolvedValueOnce([{ id: 'delta-existing', statement: 'Автобус ходит реже', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 100, locationLabel: 'Остановка', createdAt: '2026-01-01T00:00:00.000Z' }]);
    vi.mocked(reactToDelta).mockRejectedValueOnce(new Error('author_reaction_locked'));
    renderFlow();
    await reachPresetReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Это то же изменение' }));
    expect(await screen.findByRole('heading', { name: 'Это ваша Дельта' })).toBeInTheDocument();
  });
});
