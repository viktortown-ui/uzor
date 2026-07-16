import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MobileDeltaReviewScreen } from './MobileDeltaReviewScreen';
import { MobileDeltaCreateResult } from './MobileDeltaCreateResult';
import { createEmptyDeltaDraft } from '../deltaCreateLogic';
import type { DeltaCreateDraft } from '../deltaCreateTypes';
import type { DeltaCard } from '../../deltas/deltaTypes';
import { findSimilarDeltas } from '../../deltas/deltaApi';

vi.mock('../../../app/appMode', () => ({ isDemoMode: false, appMode: 'production' }));

vi.mock('../../deltas/deltaApi', async () => {
  const actual = await vi.importActual<typeof import('../../deltas/deltaApi')>('../../deltas/deltaApi');
  return { ...actual, findSimilarDeltas: vi.fn() };
});

const mockedFindSimilar = vi.mocked(findSimilarDeltas);
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};

function validDraft(patch: Partial<DeltaCreateDraft> = {}): DeltaCreateDraft {
  return {
    ...createEmptyDeltaDraft(),
    direction: 'negative',
    categorySlug: 'transport',
    changeType: 'slower',
    subject: 'ожидание автобуса',
    statement: 'Ожидание автобуса стало дольше',
    observedWindow: 'today',
    impactLevel: 'strong',
    lat: 58.01,
    lng: 56.25,
    locationLabel: 'Остановка Попова',
    locationSource: 'map',
    ...patch,
  };
}

const categories = [{ slug: 'transport', title: 'Транспорт', iconKey: 'transport' }];

function renderReview(draft = validDraft(), update = vi.fn()) {
  return render(
    <MemoryRouter>
      <MobileDeltaReviewScreen
        draft={draft}
        update={update}
        categories={categories}
        circleContext={{ circleId: 'circle-1', citySlug: 'perm' }}
        publishing={false}
        onCreateSeparate={vi.fn()}
        onConfirmExisting={vi.fn()}
        publishError=""
        authorLocked={false}
        onRetryFailed={vi.fn()}
      />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('MobileDeltaReviewScreen', () => {
  it('keeps a pending search alive while non-key review fields change', async () => {
    const request = deferred<Awaited<ReturnType<typeof findSimilarDeltas>>>();
    mockedFindSimilar.mockReturnValueOnce(request.promise);
    const first = validDraft();
    const view = renderReview(first);
    await waitFor(() => expect(mockedFindSimilar).toHaveBeenCalledTimes(1));
    view.rerender(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={{ ...first, subject: 'Новый заголовок автобуса', statement: 'Новый заголовок автобуса', observedWindow: 'last_week', impactLevel: 'critical', details: 'Новый комментарий' }}
          update={vi.fn()} categories={categories} circleContext={{ circleId: 'circle-1', citySlug: 'perm' }} publishing={false}
          onCreateSeparate={vi.fn()} onConfirmExisting={vi.fn()} publishError="" authorLocked={false} onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(mockedFindSimilar).toHaveBeenCalledTimes(1);
    request.resolve([{ id: 'kept', statement: 'Результат исходного запроса', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 80, locationLabel: 'Рядом', createdAt: '2026-01-01T00:00:00.000Z' }]);
    expect(await screen.findByText('Результат исходного запроса')).toBeInTheDocument();
    expect(screen.queryByText('Проверяем похожие Дельты рядом…')).not.toBeInTheDocument();
  });

  it('ignores a stale response after the similarity key changes', async () => {
    const requestA = deferred<Awaited<ReturnType<typeof findSimilarDeltas>>>();
    const requestB = deferred<Awaited<ReturnType<typeof findSimilarDeltas>>>();
    mockedFindSimilar.mockReturnValueOnce(requestA.promise).mockReturnValueOnce(requestB.promise);
    const first = validDraft();
    const view = renderReview(first);
    await waitFor(() => expect(mockedFindSimilar).toHaveBeenCalledTimes(1));
    view.rerender(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={{ ...first, lat: 58.03, lng: 56.27 }} update={vi.fn()} categories={categories}
          circleContext={{ circleId: 'circle-1', citySlug: 'perm' }} publishing={false} onCreateSeparate={vi.fn()}
          onConfirmExisting={vi.fn()} publishError="" authorLocked={false} onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );
    await waitFor(() => expect(mockedFindSimilar).toHaveBeenCalledTimes(2));
    requestA.resolve([{ id: 'stale', statement: 'Устаревший результат', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 80, locationLabel: 'Старое место', createdAt: '2026-01-01T00:00:00.000Z' }]);
    expect(screen.queryByText('Устаревший результат')).not.toBeInTheDocument();
    requestB.resolve([{ id: 'fresh', statement: 'Актуальный результат', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 40, locationLabel: 'Новое место', createdAt: '2026-01-01T00:00:00.000Z' }]);
    expect(await screen.findByText('Актуальный результат')).toBeInTheDocument();
    expect(mockedFindSimilar).toHaveBeenCalledTimes(2);
  });

  it('restores a separate decision as ready without searching or hanging', async () => {
    renderReview(validDraft({ similarDecision: 'separate', selectedSimilarDeltaId: null }));
    expect(screen.getByText('Проверка похожих изменений пропущена')).toBeInTheDocument();
    expect(screen.queryByText('Проверяем похожие Дельты рядом…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Опубликовать' })).toBeEnabled();
    expect(mockedFindSimilar).not.toHaveBeenCalled();
  });

  it('restores an existing decision by searching once without confirming automatically', async () => {
    const onConfirmExisting = vi.fn();
    mockedFindSimilar.mockResolvedValueOnce([{ id: 'delta-1', statement: 'Автобус ходит реже', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 120, locationLabel: 'Остановка Попова', createdAt: '2026-01-01T00:00:00.000Z' }]);
    render(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={validDraft({ similarDecision: 'existing', selectedSimilarDeltaId: 'delta-1' })}
          update={vi.fn()}
          categories={categories}
          circleContext={{ circleId: 'circle-1', citySlug: 'perm' }}
          publishing={false}
          onCreateSeparate={vi.fn()}
          onConfirmExisting={onConfirmExisting}
          publishError=""
          authorLocked={false}
          onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Похожее изменение уже отметили')).toBeInTheDocument();
    expect(screen.queryByText('Проверяем похожие Дельты рядом…')).not.toBeInTheDocument();
    expect(mockedFindSimilar).toHaveBeenCalledTimes(1);
    expect(onConfirmExisting).not.toHaveBeenCalled();
  });

  it('runs one automatic similarity search and does not restart after continue without checking', async () => {
    mockedFindSimilar.mockRejectedValueOnce(new Error('network'));
    const update = vi.fn();
    renderReview(validDraft(), update);

    await screen.findByRole('heading', { name: 'Не удалось проверить похожие Дельты' });
    expect(mockedFindSimilar).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Продолжить без проверки' }));
    expect(update).toHaveBeenCalledWith({ similarDecision: 'separate', selectedSimilarDeltaId: null });
    expect(mockedFindSimilar).toHaveBeenCalledTimes(1);
  });

  it('retry explicitly runs another search and found rows use Russian enum labels', async () => {
    mockedFindSimilar
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([
        {
          id: 'delta-1',
          statement: 'Автобус ходит реже',
          status: 'confirmed',
          confirmCount: 4,
          disconfirmCount: 0,
          distanceMeters: 120,
          locationLabel: 'Остановка Попова',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

    renderReview(validDraft({ impactLevel: 'critical' }));

    expect(await screen.findByText(/Критично мешает/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText(/Подтверждена · Остановка Попова/)).toBeInTheDocument();
    expect(mockedFindSimilar).toHaveBeenCalledTimes(2);
  });

  it('selecting existing does not start another automatic search', async () => {
    const onConfirmExisting = vi.fn();
    mockedFindSimilar.mockResolvedValueOnce([
      {
        id: 'delta-1',
        statement: 'Автобус ходит реже',
        status: 'new',
        confirmCount: 1,
        disconfirmCount: 0,
        distanceMeters: 120,
        locationLabel: 'Остановка Попова',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]);

    render(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={validDraft()}
          update={vi.fn()}
          categories={categories}
          circleContext={{ circleId: 'circle-1', citySlug: 'perm' }}
          publishing={false}
          onCreateSeparate={vi.fn()}
          onConfirmExisting={onConfirmExisting}
          publishError=""
          authorLocked={false}
          onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Новая · Остановка Попова/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Это то же изменение' }));
    expect(onConfirmExisting).toHaveBeenCalledWith('delta-1');
    expect(mockedFindSimilar).toHaveBeenCalledTimes(1);
  });

  it('invalid title blocks publication when no similar Delta exists', async () => {
    const onCreateSeparate = vi.fn();
    mockedFindSimilar.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={validDraft({ subject: 'мало', statement: 'мало' })}
          update={vi.fn()}
          categories={categories}
          circleContext={{ circleId: 'circle-1', citySlug: 'perm' }}
          publishing={false}
          onCreateSeparate={onCreateSeparate}
          onConfirmExisting={vi.fn()}
          publishError=""
          authorLocked={false}
          onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: 'Опубликовать' })).toBeDisabled();
    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Опубликовать' }));
    expect(onCreateSeparate).not.toHaveBeenCalled();
  });

  it('invalid title blocks the separate path while existing confirmation remains available', async () => {
    const onCreateSeparate = vi.fn();
    mockedFindSimilar.mockResolvedValueOnce([{ id: 'delta-2', statement: 'Похожее изменение', status: 'new', confirmCount: 1, disconfirmCount: 0, distanceMeters: 50, locationLabel: 'Рядом', createdAt: '2026-01-01T00:00:00.000Z' }]);
    render(
      <MemoryRouter>
        <MobileDeltaReviewScreen
          draft={validDraft({ subject: 'мало', statement: 'мало' })}
          update={vi.fn()}
          categories={categories}
          circleContext={{ circleId: 'circle-1', citySlug: 'perm' }}
          publishing={false}
          onCreateSeparate={onCreateSeparate}
          onConfirmExisting={vi.fn()}
          publishError=""
          authorLocked={false}
          onRetryFailed={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('button', { name: 'Это другое изменение' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Это то же изменение' })).toBeEnabled();
    expect(onCreateSeparate).not.toHaveBeenCalled();
  });
});

describe('MobileDeltaCreateResult', () => {
  const delta: DeltaCard = {
    id: 'delta-1',
    statement: 'Ожидание автобуса стало дольше',
    category: { slug: 'transport', title: 'Транспорт', iconKey: 'transport' },
    direction: 'negative',
    subject: 'ожидание автобуса',
    changeType: 'slower',
    details: null,
    observedWindow: 'today',
    impactLevel: 'strong',
    status: 'checking',
    moderationState: 'visible',
    confirmCount: 2,
    disconfirmCount: 0,
    confirmationTarget: 3,
    location: { lat: 58.01, lng: 56.25, label: 'Остановка Попова' },
    priorityScore: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastActivityAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2026-01-02T00:00:00.000Z',
  };

  it('renders confirmed result actions and focuses heading', async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<MobileDeltaCreateResult mode="confirmed_existing" delta={delta} onReset={vi.fn()} onShare={vi.fn()} shareStatus="" />} />
        </Routes>
      </MemoryRouter>,
    );

    const heading = screen.getByRole('heading', { name: 'Вы подтвердили Дельту' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole('link', { name: 'Показать на карте' })).toHaveAttribute('href', '/map?delta=delta-1');
    expect(screen.getByRole('button', { name: 'Поделиться' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить ещё' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Вернуться в Пульс' })).toHaveAttribute('href', '/pulse');
  });
});
