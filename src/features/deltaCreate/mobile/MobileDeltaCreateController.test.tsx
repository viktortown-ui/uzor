import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MobileDeltaCreateFlow } from './MobileDeltaCreateFlow';
import { DELTA_CREATE_PRODUCTION_STORAGE_KEY } from '../deltaCreateProductionLogic';
import { serializeDeltaDraft, createEmptyDeltaDraft, buildDeltaStatement } from '../deltaCreateLogic';
import { createDelta, findSimilarDeltas, getDeltaCard, loadDeltaCategories, reactToDelta } from '../../deltas/deltaApi';
import { loadDeltaMapContext } from '../../deltaMap/deltaMapLogic';

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
  id: 'delta-1',
  statement: 'Ожидание автобуса стало дольше',
  category: categories[0],
  direction: 'negative',
  subject: 'ожидание автобуса',
  changeType: 'slower',
  details: null,
  observedWindow: 'today',
  impactLevel: 'strong',
  status: 'checking',
  moderationState: 'visible',
  confirmCount: 1,
  disconfirmCount: 0,
  confirmationTarget: 3,
  location: { lat: 58.02, lng: 56.26, label: 'Выбранная точка в Перми' },
  priorityScore: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  lastActivityAt: '2026-01-01T00:00:00.000Z',
  expiresAt: '2026-01-02T00:00:00.000Z',
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

async function fillValidChange() {
  fireEvent.click(await screen.findByRole('button', { name: 'Стало хуже' }));
  fireEvent.click(screen.getByRole('button', { name: 'Транспорт' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Стало медленнее' }));
  fireEvent.change(screen.getByLabelText('Коротко опишите изменение'), { target: { value: 'ожидание автобуса' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сегодня' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сильно мешает' }));
}

async function reachReview() {
  await fillValidChange();
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
  await screen.findByRole('heading', { name: 'Где' });
  mapMocks.handlers.click({ lngLat: { lat: 58.02, lng: 56.26 } });
  fireEvent.click(await screen.findByRole('button', { name: 'Подтвердить место' }));
  await screen.findByRole('heading', { name: 'Проверьте Дельту' });
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
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
  Object.keys(mapMocks.handlers).forEach((key) => delete mapMocks.handlers[key]);
});

describe('MobileDeltaCreateFlow controller', () => {
  it('invalid change stays on change, valid change advances to location, valid location advances to review', async () => {
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Продолжить' }));
    expect(screen.getByRole('heading', { name: 'Что изменилось?' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Выберите: стало лучше или хуже');

    await reachReview();
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute?stage=review');
  });

  it('browser Back and header Back follow stage history without duplicate stages', async () => {
    renderFlow();
    await reachReview();

    fireEvent.click(screen.getByLabelText('Назад'));
    expect(await screen.findByRole('heading', { name: 'Где' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Назад'));
    expect(await screen.findByRole('heading', { name: 'Что изменилось?' })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Закрыть создание Дельты'));
    expect(await screen.findByRole('heading', { name: 'Пульс' })).toBeInTheDocument();
  });

  it('direct incomplete review is replaced to change', async () => {
    renderFlow('/contribute?stage=review');
    expect(await screen.findByRole('heading', { name: 'Что изменилось?' })).toBeInTheDocument();
    expect(screen.getByLabelText('route')).toHaveTextContent('/contribute');
  });

  it('persists draft and derives resume stage', async () => {
    const draft = { ...createEmptyDeltaDraft(), direction: 'negative' as const, categorySlug: 'transport' as const, changeType: 'slower' as const, subject: 'ожидание автобуса', observedWindow: 'today' as const, impactLevel: 'strong' as const };
    draft.statement = buildDeltaStatement(draft);
    localStorage.setItem(DELTA_CREATE_PRODUCTION_STORAGE_KEY, serializeDeltaDraft(draft));

    renderFlow();
    expect(await screen.findByRole('heading', { name: 'Продолжить Дельту?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
    expect(await screen.findByRole('heading', { name: 'Где' })).toBeInTheDocument();
  });

  it('publishes a new Delta once on double click and shows result', async () => {
    renderFlow();
    await reachReview();
    await screen.findByText('Похожих Дельт рядом не найдено');
    const publish = screen.getByRole('button', { name: 'Опубликовать Дельту' });
    fireEvent.click(publish);
    fireEvent.click(publish);

    expect(await screen.findByRole('heading', { name: 'Дельта опубликована' })).toBeInTheDocument();
    expect(createDelta).toHaveBeenCalledTimes(1);
  });

  it('confirms existing Delta and falls back when card reload fails', async () => {
    vi.mocked(findSimilarDeltas).mockResolvedValueOnce([{ id: 'delta-existing', statement: 'Автобус ходит реже', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 100, locationLabel: 'Остановка', createdAt: '2026-01-01T00:00:00.000Z' }]);
    vi.mocked(getDeltaCard).mockRejectedValueOnce(new Error('reload failed'));

    renderFlow();
    await reachReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Это то же изменение' }));

    expect(await screen.findByRole('heading', { name: 'Вы подтвердили Дельту' })).toBeInTheDocument();
    expect(reactToDelta).toHaveBeenCalledTimes(1);
  });

  it('failed publication can retry and author lock is shown', async () => {
    vi.mocked(createDelta).mockRejectedValueOnce(new Error('api down')).mockResolvedValueOnce({ delta, effect: { type: 'created', previousStatus: null, newStatus: 'checking', message: 'ok', detail: 'Первая отметка закреплена.' } });
    renderFlow();
    await reachReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Опубликовать Дельту' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));
    expect(await screen.findByRole('heading', { name: 'Дельта опубликована' })).toBeInTheDocument();

    cleanup();
    vi.mocked(findSimilarDeltas).mockResolvedValueOnce([{ id: 'delta-existing', statement: 'Автобус ходит реже', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 100, locationLabel: 'Остановка', createdAt: '2026-01-01T00:00:00.000Z' }]);
    vi.mocked(reactToDelta).mockRejectedValueOnce(new Error('author_reaction_locked'));
    renderFlow();
    await reachReview();
    fireEvent.click(await screen.findByRole('button', { name: 'Это то же изменение' }));
    expect(await screen.findByRole('heading', { name: 'Это ваша Дельта' })).toBeInTheDocument();
  });
});
